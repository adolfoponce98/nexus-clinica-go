import { Component, signal, inject, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';

import { PatientIdentificationComponent } from '../../expediente/baseFormPersonaldentification/patient-identification.component';
import { AuthService } from '../../auth/auth.service';
import { LucideAngularModule, User, Check, X } from 'lucide-angular';

@Component({
  selector: 'app-medical-record-form',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PatientIdentificationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'medical-record-form.component.html'
})
export class MedicalRecordFormComponent implements OnInit {
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly icons = {
    User, Check, X
  };

  // 🔐 Credenciales de seguridad y endpoint
  private readonly SAVE_URL = 'https://registernewpatient-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  isLoading = signal(false);
  loadingMessage = signal('');
  showSuccessModal = signal(false);
  successMessage = signal('');

  idConsultorio = '';
  nombreConsultorio = '';
  nombreMedico = '';

  ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.nombreConsultorio = "Consultorio " + (defaultOffice?.name || 'Default');
    this.idConsultorio = defaultOffice?.idConsultorio || 'default_consultorio';

    const sessionData = this.authService.getSession();
    const email = sessionData?.fullName || sessionData?.email || 'doctor@nexuscliniq.com';
    this.nombreMedico = email.split('@')[0].toUpperCase();

    if (defaultOffice) {
      this.authService.saveSucursal(defaultOffice);
    }
  }

  async handleSavePatientData(formData: any) {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('Sesión expirada. Inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Guardando datos generales y antecedentes...');

    const email = sessionData?.email || 'doctor@nexuscliniq.com';
    const idDoctor = email.trim().toLowerCase().replace(/[\/\\]/g, '_');

    const rawPayload = {
      idDoctor: idDoctor,
      idConsultorio: this.idConsultorio,
      especialidad: 'traumatologia',
      generalIdentificationData: {
        firstName: formData.firstName?.trim() || '-',
        paternalSurname: formData.paternalSurname?.trim() || '-',
        maternalSurname: formData.maternalSurname?.trim() || '-',
        birthDate: formData.birthDate || '-',
        age: formData.age !== null && formData.age !== undefined && formData.age !== '' ? formData.age : '-',
        gender: formData.gender || '-',
        curp: formData.curp?.trim().toUpperCase() || '-',
        cellphone: formData.cellphone?.trim() || '-',
        homePhone: formData.homePhone?.trim() || '-',
        email: formData.email?.trim() || '-',
        streetAndNumber: formData.streetAndNumber?.trim() || '-',
        neighborhood: formData.neighborhood?.trim() || '-',
        municipality: formData.municipality?.trim() || '-',
        state: formData.state?.trim() || '-',
        country: formData.country?.trim() || '-',
        maritalStatus: formData.maritalStatus || '-',
        educationLevel: formData.educationLevel || '-',
        religion: formData.religion?.trim() || '-',
        occupation: formData.occupation?.trim() || '-',
        additionalNote: formData.additionalNote?.trim() || '-'
      },
      hereditaryFamilyBackground: {
        selections: formData.familyBackground || {},
        otherDiseases: formData.familyBackgroundOther?.trim() || '-'
      },
      pathologicalBackground: {
        selections: formData.pathologicalBackground || {},
        otherConditions: formData.pathologicalBackgroundOther?.trim() || '-'
      },
      nonPathologicalBackground: {
        selections: formData.nonPathologicalBackground || {},
        otherHabits: formData.nonPathologicalBackgroundOther?.trim() || '-'
      }
    };

    try {
      const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), this.ENCRYPTION_KEY).toString();
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
        'x-app-signature': this.APP_SECRET_HEADER,
        'x-client-source': 'angular'
      });

      this.http.post<any>(this.SAVE_URL, { encryptedData }, { headers }).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res && res.encryptedData) {
            try {
              // 🔓 Desencriptar el response del servidor
              const bytes = CryptoJS.AES.decrypt(res.encryptedData, this.ENCRYPTION_KEY);
              const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

              console.log('✅ Response desencriptado del servidor:', decryptedResponse);

              // Puedes usar los datos desencriptados (ej. ID del paciente generado, etc.)
              this.successMessage.set('¡Datos generales y antecedentes registrados con éxito!');
              this.showSuccessModal.set(true);
            } catch (decryptErr) {
              console.error('❌ Error al desencriptar la respuesta del servidor:', decryptErr);
              alert('Error al procesar la respuesta segura del servidor.');
            }
          } else {
            alert('Ocurrió un error al registrar los datos del paciente.');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error('Error al guardar datos:', err);
          alert('Error de red al intentar guardar el registro.');
        }
      });
    } catch (e) {
      this.isLoading.set(false);
      console.error('Error de encriptación:', e);
    }
  }
}
