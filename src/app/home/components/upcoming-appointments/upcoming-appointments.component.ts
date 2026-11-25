import { versionedFetch } from '../../../auth/sync-cache';
import { normalizeAppointment } from '../../../appointment-history/appointment-history.utils';
import { SECURITY_CONFIG } from '../../../config/security.config';
import { API_URLS } from '../../../config/api-urls';
import { Component, input, computed, signal, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronRight, CheckCircle2, XCircle, Loader2 } from 'lucide-angular';
import CryptoJS from 'crypto-js';
import { AuthService } from '../../../auth/auth.service';
import { TokenInterceptorService } from '../../../auth/token-interceptor.service';

@Component({
  selector: 'app-upcoming-appointments',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'upcoming-appointments.component.html',
})
export class UpcomingAppointmentsComponent {
  private authService = inject(AuthService);
  private tokenInterceptor = inject(TokenInterceptorService);

  readonly ChevronRight = ChevronRight;
  readonly CheckCircle2 = CheckCircle2;
  readonly XCircle = XCircle;
  readonly Loader2 = Loader2;

  appointments = input.required<Array<any>>();
  viewAllClicked = output<void>();
  onViewAll(): void {
    this.viewAllClicked.emit();
  }
  selectedCitaForAction = signal<any | null>(null);

  // 🔄 Estados de carga y diálogos de éxito
  isLoading = signal<boolean>(false);
  successMessage = signal<string | null>(null);

  objectKeys = Object.keys;

  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;
  private readonly MODIFY_APPOINTMENT_URL = API_URLS.MODIFY_OR_DELETE_APPOINTMENT;

  groupedAppointments = computed(() => {
    const rawList = this.appointments().flatMap((item) => {
      const appointment = normalizeAppointment(item);
      return appointment ? [appointment] : [];
    });
    if (!rawList || rawList.length === 0) return {};

    const now = new Date();

    const futureAppointments = rawList.filter((item) => {
      if (!item.date || !item.time) return false;
      const appointmentDateTime = new Date(`${item.date}T${item.time}:00`);
      return appointmentDateTime > now && [0, 1].includes(Number(item.status ?? 0));
    });

    if (futureAppointments.length === 0) return {};

    const sorted = futureAppointments.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}:00`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time}:00`).getTime();
      return dateTimeA - dateTimeB;
    });

    const mapped = sorted.slice(0, 10).map((item) => {
      let formattedDate = 'Fecha por definir';
      if (item.date) {
        const [year, month, day] = item.date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        formattedDate = dateObj.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }

      const statusCode = Number(item.status);
      let statusText = 'Sin confirmar';
      let statusClass = 'Sin confirmar';

      if (statusCode === 1) {
        statusText = 'Confirmada';
        statusClass = 'Confirmada';
      } else if (statusCode === 2) {
        statusText = 'Cancelada';
        statusClass = 'Cancelada';
      }

      return {
        ...item,
        statusText,
        statusClass,
        dateFormatted: formattedDate,
      };
    });

    return mapped.reduce((acc: Record<string, typeof mapped>, cita) => {
      if (!acc[cita.dateFormatted]) {
        acc[cita.dateFormatted] = [];
      }
      acc[cita.dateFormatted].push(cita);
      return acc;
    }, {});
  });

  toggleDialog(cita: any) {
    if (this.isLoading()) return;
    if (this.selectedCitaForAction() === cita) {
      this.selectedCitaForAction.set(null);
    } else {
      this.selectedCitaForAction.set(cita);
    }
  }
  async handleAppointmentAction(cita: any, actionType: number, event: Event) {
    event.stopPropagation();
    this.isLoading.set(true);
    this.selectedCitaForAction.set(null);

    try {
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';

      const newStatus = actionType === 1 ? 1 : actionType === 2 ? 2 : Number(cita.status);

      const appointmentDataPayload = {
        colorClass: cita.colorClass || '',
        date: cita.date || '',
        durationLabel: cita.durationLabel || '',
        durationMinutes: cita.durationMinutes || 0,
        email: cita.email || '',
        endTime: cita.endTime || '',
        patientName: cita.patientName || cita.name || '',
        phone: cita.phone || '',
        reason: cita.reason || cita.specialty || '',
        syncId: cita.syncId || '',
        time: cita.time || '',
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      const payload = {
        idConsultorio: idConsultorio,
        actionType: actionType, // 1 = Confirmar, 2 = Cancelar, 3 = Eliminar
        appointmentData: appointmentDataPayload,
      };

      const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
        const ciphertext = CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          this.ENCRYPTION_KEY,
        ).toString();

        return await versionedFetch(this.MODIFY_APPOINTMENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData: ciphertext }),
        });
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al procesar la solicitud en el servidor.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedResponse && decryptedResponse.success) {
        const cached = this.authService.getCachedAppointments();
        let updatedList = [];

        if (actionType === 3) {
          // 🛠️ Filtrado estricto por syncId o combinación única de fecha y hora
          updatedList = cached.filter((item: any) => !this.isSameAppointment(item, cita));
        } else {
          updatedList = cached.map((item: any) => {
            if (this.isSameAppointment(item, cita)) {
              return {
                ...item,
                status: newStatus,
                updatedAt: appointmentDataPayload.updatedAt,
              };
            }
            return item;
          });
        }

        // 🚀 IMPORTANTE: Pasamos 'true' en el segundo parámetro para sobreescribir la caché de forma limpia
        this.authService.saveCachedAppointments(updatedList, true);

        let successMsg = '¡Operación exitosa!';
        if (actionType === 1) successMsg = '¡Cita confirmada correctamente!';
        else if (actionType === 2) successMsg = '¡Cita cancelada correctamente!';
        else if (actionType === 3) successMsg = '¡Cita eliminada correctamente!';

        this.successMessage.set(successMsg);

        setTimeout(() => {
          this.successMessage.set(null);
        }, 3000);
      }
    } catch (err) {
      console.error('❌ Error al procesar la cita:', err);
      alert('Ocurrió un error al procesar la solicitud.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // 🛠️ Función de comparación robusta basada en syncId prioritario
  private isSameAppointment(item: any, target: any): boolean {
    if (item.syncId && target.syncId) {
      return item.syncId === target.syncId;
    }
    return (
      item.date === target.date &&
      item.time === target.time &&
      (item.patientName === target.patientName ||
        item.name === target.name ||
        item.patientName === target.name)
    );
  }
}
