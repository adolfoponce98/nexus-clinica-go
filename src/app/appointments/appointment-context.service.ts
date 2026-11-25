import { patientSummary } from '../patient/patient-summary';
import { inject, Injectable } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import CryptoJS from 'crypto-js';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { patientId } from './appointment-patient';
@Injectable({ providedIn: 'root' })
export class AppointmentContextService {
  private readonly auth = inject(AuthService);
  private readonly tokens = inject(TokenInterceptorService);
  private readonly router = inject(Router);
  private pending: any = null;
  private purpose: 'new' | 'consultation' = 'new';
  constructor() {
    this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationStart &&
        !/^\/expediente\/(nuevo|nuevaRevision)(\/|$|\?)/.test(event.url)
      )
        this.clear();
    });
  }
  private pendingScope = '';
  private scope() {
    const session = this.auth.getSession();
    return JSON.stringify([
      session?.email,
      session?.idDoctor || session?.email,
      this.auth.getSucursal()?.idConsultorio,
    ]);
  }
  current() {
    if (this.pendingScope !== this.scope()) this.pending = null;
    return this.pending;
  }
  begin(appointment: any, purpose: 'new' | 'consultation' = 'new') {
    this.purpose = purpose;
    this.pending = { ...appointment };
    this.pendingScope = this.scope();
  }
  clear() {
    this.pending = null;
  }
  async link(appointment: any, patient: any) {
    const scope = this.scope();
    const payload = {
      idConsultorio: this.auth.getSucursal()?.idConsultorio,
      date: appointment.date,
      time: appointment.time,
      syncId: appointment.syncId || appointment.searchDocId,
      version: appointment.version,
      idPaciente: patientId(patient),
    };
    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      SECURITY_CONFIG.ENCRYPTION_KEY,
    ).toString();
    const response = await this.tokens.executeWithAuth((token) =>
      fetch(API_URLS.LINK_APPOINTMENT_PATIENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': SECURITY_CONFIG.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ encryptedData }),
      }),
    );
    const envelope = await response.json();
    const result = JSON.parse(
      CryptoJS.AES.decrypt(envelope.encryptedData, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
        CryptoJS.enc.Utf8,
      ),
    );
    if (!response.ok || !result.success)
      throw new Error(result.error || 'No se pudo vincular el paciente.');
    if (scope !== this.scope()) throw new Error('El consultorio cambió. Vuelve a abrir la cita.');
    this.auth.saveCachedAppointments([result.appointment]);
    return result.appointment;
  }
  attend(appointment: any) {
    this.begin(appointment, 'consultation');
    const id = appointment.idPaciente || appointment.idPatient;
    if (!id) return;
    const encryptedId = btoa(CryptoJS.AES.encrypt(id, SECURITY_CONFIG.ENCRYPTION_KEY).toString());
    return this.router.navigate(['/expediente/nuevaRevision', encryptedId]);
  }
  identificationPrefill() {
    const a = this.current();
    return a && this.purpose === 'new'
      ? { firstName: a.patientName || '', cellphone: a.phone || '', email: a.email || '' }
      : null;
  }
  async recordCreated(result: any, officeId?: string): Promise<string> {
    if (!result.success) throw new Error(result.error || 'No se pudo crear el expediente.');
    const session = this.auth.getSession();
    const office = this.auth.getSucursal()?.idConsultorio;
    if (
      !session ||
      ((officeId || result.patient?.idConsultorio) &&
        (officeId || result.patient?.idConsultorio) !== office) ||
      (result.patient?.idDoctor &&
        result.patient.idDoctor !==
          String(session.idDoctor || session.email)
            .trim()
            .toLowerCase()
            .replace(/[\/\\]/g, '_'))
    )
      return ' El expediente quedó registrado en el consultorio original; la selección actual cambió.';
    const patient = result.patient || {
      idPaciente: result.patientId,
      expedienteId: result.expedienteId,
      numeroDeExpediente: result.numeroDeExpediente,
    };
    if (patientId(patient))
      this.auth.saveCachedPatients([
        ...this.auth.getCachedPatients().filter((p) => patientId(p) !== patientId(patient)),
        patientSummary(patient),
      ]);
    const appointment = this.current();
    if (!appointment || this.purpose !== 'new') return '';
    try {
      const linked = await this.link(appointment, patient);
      await this.attend(linked);
      return '';
    } catch {
      this.clear();
      return ' El expediente ya se creó. Vuelve a Home y usa «Vincular paciente» para asociarlo a la cita.';
    }
  }
}
