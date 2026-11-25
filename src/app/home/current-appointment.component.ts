import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Clock,
  Phone,
  Mail,
  Stethoscope,
  User,
  Search,
  X,
  FilePlus,
  ArrowRight,
  Building2,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../auth/permission.service';
import { AppointmentContextService } from '../appointments/appointment-context.service';
import { isCurrentAppointment, patientId, patientName } from '../appointments/appointment-patient';
@Component({
  selector: 'app-current-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './current-appointment.component.html',
})
export class CurrentAppointmentComponent implements OnInit, OnDestroy {
  readonly permissions = inject(PermissionService);
  readonly context = inject(AppointmentContextService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly icons = {
    Clock,
    Phone,
    Mail,
    Stethoscope,
    User,
    Search,
    X,
    FilePlus,
    ArrowRight,
    Building2,
  };
  readonly appointment = signal<any>(null);
  readonly searching = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  query = '';
  private readonly subscriptions = new Subscription();
  private timer?: ReturnType<typeof setInterval>;
  private dismissed = new Set<string>();
  private key(a: any) {
    return a.syncId || a.searchDocId || `${a.date}|${a.time}`;
  }
  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 15000);
    this.subscriptions.add(this.auth.appointmentsUpdated$.subscribe(() => this.refresh()));
    this.subscriptions.add(
      this.auth.branchChanged$.subscribe(() => {
        this.dismissed.clear();
        this.searching.set(false);
        this.error.set('');
        this.refresh();
      }),
    );
    this.subscriptions.add(this.auth.patientsUpdated$.subscribe(() => this.refresh()));
  }
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.timer) clearInterval(this.timer);
  }
  refresh() {
    if (!this.permissions.can('calendar')) {
      this.appointment.set(null);
      return;
    }
    const now = new Date();
    const active = this.auth
      .getCachedAppointments()
      .filter((a) => isCurrentAppointment(a, now) && !this.dismissed.has(this.key(a)))
      .sort((a, b) => String(b.time).localeCompare(String(a.time)))[0];
    this.appointment.set(active || null);
  }
  office() {
    return this.auth.getSucursal()?.name || 'Consultorio actual';
  }
  linked() {
    return !!(this.appointment()?.idPaciente || this.appointment()?.idPatient);
  }
  dismiss() {
    const a = this.appointment();
    if (a) this.dismissed.add(this.key(a));
    this.searching.set(false);
    this.refresh();
  }
  search() {
    this.query = '';
    this.error.set('');
    this.searching.set(true);
  }
  patients() {
    const key = this.query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return this.auth
      .getCachedPatients()
      .filter((p) =>
        [
          patientName(p),
          p.numeroDeExpediente,
          p.telefono,
          p.correo,
          p.fichaDeIdentificacion?.telefono,
          p.fichaDeIdentificacion?.correo,
        ].some((v) =>
          String(v || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .includes(key),
        ),
      )
      .sort((a, b) => patientName(a).localeCompare(patientName(b), 'es'));
  }
  name = patientName;
  id = patientId;
  phone(p: any) {
    return p.fichaDeIdentificacion?.telefono || p.telefono || 'Sin teléfono';
  }
  email(p: any) {
    return p.fichaDeIdentificacion?.correo || p.correo || 'Sin correo';
  }
  async select(patient: any) {
    if (this.busy()) return;
    const a = this.appointment();
    if (!a) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.context.link(a, patient);
      this.searching.set(false);
      this.refresh();
    } catch (e: any) {
      this.error.set(e.message || 'No se pudo vincular. Inténtalo de nuevo.');
    } finally {
      this.busy.set(false);
    }
  }
  act() {
    const a = this.appointment();
    if (!a) return;
    if (this.linked()) {
      if (this.permissions.can('followUps', 'write')) this.context.attend(a);
    } else if (this.permissions.can('records', 'write')) {
      this.context.begin(a);
      this.router.navigate(['/expediente/nuevo']);
    }
  }
}
