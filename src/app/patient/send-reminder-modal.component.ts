import { Component, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule, MessageSquare, Mail, Bell, CheckCircle2, Loader2, AlertCircle } from 'lucide-angular';
import * as CryptoJS from 'crypto-js';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-send-reminder-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, LucideAngularModule],
  templateUrl: 'send-reminder-modal.component.html'
})
export class SendReminderModalComponent {
  private authService = inject(AuthService);

  // Íconos necesarios
  readonly icons = { MessageSquare, Mail, Bell, CheckCircle2, Loader2, AlertCircle };

  private readonly NOTIFICATIONS_URL = 'https://centernotifications-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  isLoading = signal<boolean>(false);

  // Estado único para controlar el modal de error personalizado
  showErrorModal = signal<boolean>(false);
  errorMessage = signal<string>('Ocurrió un error inesperado al enviar las notificaciones.');

  channels = {
    whatsapp: false,
    email: false,
    app: false
  };

  get allSelected(): boolean {
    return this.channels.whatsapp && this.channels.email && this.channels.app;
  }

  constructor(
    public dialogRef: MatDialogRef<SendReminderModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.channels.whatsapp = checked;
    this.channels.email = checked;
    this.channels.app = checked;
  }

  async onConfirm() {
    if (!this.channels.whatsapp && !this.channels.email && !this.channels.app) {
      this.errorMessage.set('Debes seleccionar al menos un canal de notificación.');
      this.showErrorModal.set(true);
      return;
    }

    try {
      this.isLoading.set(true);

      const payload = {
        whatsapp: this.channels.whatsapp,
        emailFlag: this.channels.email,
        appPush: this.channels.app,
        telefono: this.data?.phone || '',
        correo: this.data?.email || '',
        fromPhone: '+523300000000',
        tipoReminder: 1,
        namePatient: this.data?.patientName || 'Paciente',
        nameDoctor: 'Dr. Asignado',
        date: 'Próxima cita',
        hour: 'Horario programado',
        address: this.data?.address || 'Consultorio',
        timeBefore: '15 min'
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken || '';

      const response = await fetch(this.NOTIFICATIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          ...(jwtToken ? { 'Authorization': `Bearer ${jwtToken}` } : {})
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      const jsonRes = await response.json();

      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al comunicarse con el servidor de notificaciones.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedResponse.success) {
        // Al ser exitoso, cerramos el diálogo principal directamente pasando los resultados
        this.dialogRef.close({ success: true, results: decryptedResponse.resultados });
      } else {
        throw new Error(decryptedResponse.error || 'El servidor no pudo procesar el envío.');
      }

    } catch (error: any) {
      console.error("❌ Error crítico al enviar recordatorios:", error);
      this.errorMessage.set(error.message || 'Ocurrió un error inesperado al enviar las notificaciones.');
      this.showErrorModal.set(true); // Muestra el modal de error estilizado
    } finally {
      this.isLoading.set(false);
    }
  }

  cerrarError() {
    this.showErrorModal.set(false);
  }

  onClose() {
    this.dialogRef.close();
  }
}
