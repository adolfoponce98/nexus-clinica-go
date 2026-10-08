import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SendReminderModalComponent } from './send-reminder-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';
import {
  LucideAngularModule, ArrowLeft, FilePlus, Phone, Mail, MapPin,
  ChevronRight, Calendar, Clock, Image as ImageIcon, User,
  Activity, HeartPulse, FileText, Bell, Loader2
} from 'lucide-angular';

@Component({
  selector: 'app-clinical-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './clinical-history.component.html'
})
export class ClinicalHistoryComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  readonly icons = {
    ArrowLeft, FilePlus, Phone, Mail, MapPin,
    ChevronRight, Calendar, Clock, ImageIcon, User,
    Activity, HeartPulse, FileText, Bell, Loader2
  };

  // 🔐 URL de la Cloud Function y credenciales de seguridad
  private readonly GET_PATIENT_DETAILS_URL = 'https://getpatientexpedient-o7vmreizjq-uc.a.run.app';
  private readonly REFRESH_TOKEN_URL = 'https://refreshtoken-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  patientId = signal<string | null>(null);
  selectedCategory = signal<string>('general');
  isLoading = signal<boolean>(true);

  // Categorías del perfil detallado
  profileCategories = [
    { id: 'general', name: 'Datos Generales', icon: this.icons.User },
    { id: 'pathological', name: 'Antecedentes Patológicos', icon: this.icons.HeartPulse },
    { id: 'lifestyle', name: 'Hábitos y Ocupación', icon: this.icons.Activity },
    { id: 'fiscal', name: 'Datos Fiscales y Seguros', icon: this.icons.FileText }
  ];
  idConsultorio = signal<string>('');
  // Datos reactivos del paciente (inicializados vacíos)
  patientData = signal<any>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    age: 0,
    birthDate: '',
    gender: '',
    emergencyContact: '',
    pathologicalHistory: '',
    occupation: '',
    sport: '',
    lifestyle: '',
    fiscalData: ''
  });

  // Historial cronológico de atenciones (History Board / Follow-ups)
  historyBoard = signal<any[]>([]);
ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');
    console.log(this.idConsultorio)

    this.route.paramMap.subscribe(params => {
      const safeUrlId = params.get('id');
      if (safeUrlId) {
        try {
          // 🔓 1. Revertir el Base64 seguro para obtener el texto cifrado original de AES
          const ciphertext = atob(safeUrlId);

          // 🔓 2. Desencriptar el AES usando la llave maestra
          const bytes = CryptoJS.AES.decrypt(ciphertext, this.ENCRYPTION_KEY);
          const decryptedId = bytes.toString(CryptoJS.enc.Utf8);

          if (decryptedId) {
            this.patientId.set(decryptedId);
            this.cargarDetallePaciente(this.idConsultorio(), decryptedId);
          } else {
            console.error('❌ El ID desencriptado está vacío.');
            this.isLoading.set(false);
          }
        } catch (e) {
          console.error('❌ Error al desencriptar el ID del paciente desde la ruta:', e);
          this.isLoading.set(false);
        }
      } else {
        this.isLoading.set(false);
      }
    });
  }

  // 🚀 MÉTODO PARA CARGAR EL DETALLE DEL PACIENTE CON PETICIÓN ENCRIPTADA
  async cargarDetallePaciente(consultorioId: string, patientId: string) {
    try {
      this.isLoading.set(true);
      const sessionData = this.authService.getSession();
      let jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        console.warn('⚠️ No hay token JWT. Redirigiendo al login...');
        this.router.navigate(['/login']);
        return;
      }

      const fetchDetalle = async (token: string) => {
        const payload = {
          idConsultorio: consultorioId,
          idPaciente: patientId
        };

        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        return await fetch(this.GET_PATIENT_DETAILS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });
      };

      // 1️⃣ Primer intento con el token actual
      let response = await fetchDetalle(jwtToken);

      // 2️⃣ Si el token expiró (401), intentamos refrescarlo
      if (response.status === 401) {
        const refreshTokenValue = sessionData?.sessionToken;
        if (!refreshTokenValue) {
          this.router.navigate(['/login']);
          return;
        }

        const refreshPayload = { refreshToken: refreshTokenValue };
        const refreshCiphertext = CryptoJS.AES.encrypt(JSON.stringify(refreshPayload), this.ENCRYPTION_KEY).toString();

        const refreshResponse = await fetch(this.REFRESH_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular'
          },
          body: JSON.stringify({ encryptedData: refreshCiphertext })
        });

        const refreshJsonRes = await refreshResponse.json();
        if (!refreshResponse.ok) {
          this.router.navigate(['/login']);
          return;
        }

        const bytesRefresh = CryptoJS.AES.decrypt(refreshJsonRes.encryptedData, this.ENCRYPTION_KEY);
        const decryptedRefresh = JSON.parse(bytesRefresh.toString(CryptoJS.enc.Utf8));

        if (decryptedRefresh.success && decryptedRefresh.accessToken) {
          jwtToken = decryptedRefresh.accessToken;
          this.authService.updateSessionToken(jwtToken);
          response = await fetchDetalle(jwtToken);
        } else {
          this.router.navigate(['/login']);
          return;
        }
      }

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Error al obtener el expediente del paciente.');
      }

      const jsonRes = await response.json();

      // 🔓 Desencriptar la respuesta del servidor
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedData.success && decryptedData.patient) {
        const p = decryptedData.patient;
        const ficha = p.fichaDeIdentificacion || {};
        const ant = p.antecedentes || {};

        // Mapear datos generales del paciente
        this.patientData.set({
          fullName: ficha.nombreCompleto || 'Sin nombre',
          phone: ficha.telefono || ficha.celular || 'Sin teléfono',
          email: ficha.correo || 'Sin correo',
          address: `${ficha.calleNumero || ''}, ${ficha.coloniaCiudad || ''}`.trim() || 'Sin dirección',
          age: ficha.edad || 0,
          birthDate: ficha.fechaNacimiento || 'No especificada',
          gender: ficha.sexo || 'No especificado',
          emergencyContact: ficha.contactoEmergencia || 'No registrado',
          pathologicalHistory: `Alergias: ${(ficha.alergias || []).join(', ') || 'Ninguna'}. Traumatológicos: ${ant.antecedentesTraumaticos || 'Ninguno'}. Crónicas: ${ant.enfermedadesCronicas || 'Ninguna'}.`,
          occupation: ficha.ocupacion || 'No especificada',
          sport: ficha.actividadDeportiva || 'No especificada',
          lifestyle: ant.habitos || 'No especificados',
          fiscalData: ficha.datosFiscales || 'Sin datos fiscales registrados'
        });

        // Mapear el historial de follow-ups (History Board)
        const followUpsRaw = p.followUps || [];
        const mappedFollowUps = followUpsRaw.map((fu: any, index: number) => ({
          id: fu.followUpId || index,
          doctor: fu.doctor || 'Dr. (Consulta Médica)',
          date: fu.createdAt ? new Date(fu.createdAt).toLocaleDateString() : 'Fecha reciente',
          time: fu.createdAt ? new Date(fu.createdAt.replace('Z', '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          title: fu.medicalSummary ? fu.medicalSummary.substring(0, 40) + '...' : 'Revisión médica',
          summary: fu.medicalSummary || 'Sin resumen registrado.',
          hasPhotos: (fu.attachedImagesUrls || []).length > 0,
          images: fu.attachedImagesUrls || []
        }));

        this.historyBoard.set(mappedFollowUps);
      }
    } catch (err) {
      console.error('❌ Error al cargar detalle del paciente:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

openSendReminderModal() {
    const currentData = this.patientData();
    const dialogRef = this.dialog.open(SendReminderModalComponent, {
      width: '450px',
      data: {
        patientName: currentData.fullName,
        email: currentData.email,
        phone: currentData.phone,
        address: currentData.address
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        console.log("📤 Proceso de envío finalizado con resultados:", result.results);
      }
    });
  }

  selectCategory(categoryId: string) {
    if (this.selectedCategory() === categoryId) {
      this.selectedCategory.set('');
    } else {
      this.selectedCategory.set(categoryId);
    }
  }

 openNewRecordModal() {
    const rawId = this.patientId() || '1234';
    const ciphertext = CryptoJS.AES.encrypt(rawId, this.ENCRYPTION_KEY).toString();
    const safeUrlId = btoa(ciphertext);
    this.router.navigate(['/expediente/nuevaRevision', safeUrlId]);
  }

  verExpedienteCompleto() {
    const email = this.patientData().email;
    this.router.navigate(['/expediente/detail', email]);
  }

  volverAlListado() {
    this.router.navigate(['/pacientes']);
  }
}
