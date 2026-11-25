import { patientDetailFields } from './patient-detail-mapping';
import { ClinicalPageSkeletonComponent } from '../shared/clinical-page-skeleton.component';
import { PrescriptionComposerService } from '../recipes/prescription-composer.service';
import { PermissionDirective } from '../auth/permission.directive';
import { versionedFetch } from '../auth/sync-cache';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SendReminderModalComponent } from './send-reminder-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  ArrowLeft,
  FilePlus,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Calendar,
  Clock,
  Image as ImageIcon,
  User,
  Activity,
  HeartPulse,
  FileText,
  Bell,
  Loader2,
  Pencil,
  Check,
} from 'lucide-angular';

@Component({
  selector: 'app-clinical-history',
  standalone: true,
  imports: [
    ClinicalPageSkeletonComponent,
    PermissionDirective,
    CommonModule,
    LucideAngularModule,
    FormsModule,
  ],
  templateUrl: './clinical-history.component.html',
})
export class ClinicalHistoryComponent implements OnInit {
  private tokenInterceptor = inject(TokenInterceptorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private prescriptionComposer = inject(PrescriptionComposerService);
  openPrescription() {
    const patientId = this.patientId();
    if (patientId) this.prescriptionComposer.open({ patientId });
  }

  readonly icons = {
    ArrowLeft,
    FilePlus,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    Calendar,
    Clock,
    ImageIcon,
    User,
    Activity,
    HeartPulse,
    FileText,
    Bell,
    Loader2,
    Pencil,
    Check,
  };

  // 🔐 URL de la Cloud Function y credenciales de seguridad
  private readonly GET_PATIENT_DETAILS_URL = API_URLS.GETPATIENTEXPEDIENT;
  private readonly REFRESH_TOKEN_URL = API_URLS.REFRESHTOKEN;
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;
  // Señales de control de edición
  isEditingContact = signal<boolean>(false);
  isEditingCategory = signal<boolean>(false);

  // Copia editable temporal para los inputs
  editablePatientData = signal<any>({});
  patientId = signal<string | null>(null);
  visibleRecordNumber = signal('');
  selectedCategory = signal<string>('general');
  isLoading = signal<boolean>(true);

  // Categorías del perfil detallado
  profileCategories = [
    { id: 'general', name: 'Datos Generales', icon: this.icons.User },
    { id: 'pathological', name: 'Antecedentes Patológicos', icon: this.icons.HeartPulse },
    { id: 'lifestyle', name: 'Hábitos y Ocupación', icon: this.icons.Activity },
    { id: 'fiscal', name: 'Datos Fiscales y Seguros', icon: this.icons.FileText },
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
    fiscalData: '',
  });

  // Historial cronológico de atenciones (History Board / Follow-ups)
  historyBoard = signal<any[]>([]);
  ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');

    this.route.paramMap.subscribe((params) => {
      const safeUrlId = params.get('id');
      if (safeUrlId) {
        let decryptedId = '';
        const decodedParam = decodeURIComponent(safeUrlId);

        try {
          // Intento 1: ¿Viene con el formato antiguo (Base64 + AES)?
          try {
            const ciphertext = atob(decodedParam);
            const bytes = CryptoJS.AES.decrypt(ciphertext, this.ENCRYPTION_KEY);
            decryptedId = bytes.toString(CryptoJS.enc.Utf8);
          } catch (err) {
            // Si atob falla, pasamos al intento 2
          }

          // Intento 2: ¿Viene cifrado solo con AES (y encodeURIComponent)?
          if (!decryptedId) {
            const bytes = CryptoJS.AES.decrypt(decodedParam, this.ENCRYPTION_KEY);
            decryptedId = bytes.toString(CryptoJS.enc.Utf8);
          }

          // Intento 3: Si todo lo anterior falla, asumimos que es texto plano
          if (!decryptedId) {
            decryptedId = safeUrlId;
          }

          if (decryptedId) {
            this.patientId.set(decryptedId);
            this.cargarDetallePaciente(this.idConsultorio(), decryptedId);
          } else {
            console.error('❌ No se pudo resolver el ID del paciente.');
            this.isLoading.set(false);
          }
        } catch (e) {
          console.error('❌ Error al procesar el ID del paciente desde la ruta:', e);
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
          idPaciente: patientId,
        };

        const ciphertext = CryptoJS.AES.encrypt(
          JSON.stringify(payload),
          this.ENCRYPTION_KEY,
        ).toString();

        return await versionedFetch(this.GET_PATIENT_DETAILS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData: ciphertext }),
        });
      };

      // 1️⃣ Primer intento con el token actual
      const response = await this.tokenInterceptor.executeWithAuth(fetchDetalle);

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
        this.visibleRecordNumber.set(p.numeroDeExpediente || 'Sin folio');
        const ficha = p.fichaDeIdentificacion || {};

        // Mapear datos generales del paciente
        this.patientData.set({
          fullName: ficha.nombreCompleto || 'Sin nombre',
          phone: ficha.telefono || ficha.celular || 'Sin teléfono',
          email: ficha.correo || 'Sin correo',
          age: ficha.edad || 0,
          birthDate: ficha.fechaNacimiento || 'No especificada',
          gender: ficha.sexo || 'No especificado',
          emergencyContact: ficha.contactoEmergencia || 'No registrado',
          ...patientDetailFields(p),
          fiscalData: ficha.datosFiscales || 'Sin datos fiscales registrados',
        });

        // Mapear el historial de follow-ups (History Board)
        const followUpsRaw = p.followUps || [];

        // Opcional: ordenar explícitamente por fecha descendente (más reciente primero)
        followUpsRaw.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // De mayor a menor (más nuevo arriba)
        });

        const mappedFollowUps = followUpsRaw.map((fu: any, index: number) => ({
          id: fu.followUpId || `reg_${index}`,
          displayId: fu.numeroDeConsulta || fu.followUpDisplayId || fu.followUpId,
          expedienteId: fu.expedienteId,
          consultationReason: fu.consultationReason || 'Sin motivo registrado',
          doctor: fu.doctor || 'Dr. (Consulta Médica)',
          date: fu.createdAt ? new Date(fu.createdAt).toLocaleDateString() : 'Fecha reciente',
          time: fu.createdAt
            ? new Date(fu.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
          title: fu.medicalSummary ? fu.medicalSummary.substring(0, 40) + '...' : 'Revisión médica',
          summary: fu.medicalSummary || 'Sin resumen registrado.',
          hasPhotos: (fu.attachedImagesUrls || []).length > 0,
          images: fu.attachedImagesUrls || [],
        }));

        this.historyBoard.set(mappedFollowUps);
      }
    } catch (err) {
      console.error('❌ Error al cargar detalle del paciente:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Habilitar / deshabilitar edición de contacto
  toggleEditContact() {
    if (!this.isEditingContact()) {
      // Copiamos los datos actuales al modelo editable
      this.editablePatientData.set({ ...this.patientData() });
      this.isEditingContact.set(true);
    } else {
      this.isEditingContact.set(false);
    }
  }

  // Habilitar / deshabilitar edición de la categoría seleccionada
  toggleEditCategory() {
    if (!this.isEditingCategory()) {
      this.editablePatientData.set({ ...this.patientData() });
      this.isEditingCategory.set(true);
    } else {
      this.isEditingCategory.set(false);
    }
  }

  // Guardar cambios de contacto
  async saveContactData() {
    await this.persistPatientChanges();
    this.isEditingContact.set(false);
  }

  // Guardar cambios de categoría
  async saveCategoryData() {
    await this.persistPatientChanges();
    this.isEditingCategory.set(false);
  }

  openSendReminderModal() {
    const currentData = this.patientData();
    const dialogRef = this.dialog.open(SendReminderModalComponent, {
      width: '450px',
      data: {
        patientName: currentData.fullName,
        email: currentData.email,
        phone: currentData.phone,
        address: currentData.address,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        console.log('📤 Proceso de envío finalizado con resultados:', result.results);
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

  verExpedienteCompleto(followUpId: string) {
    // 1. Ciframos el followUpId que viene como parámetro (ej. "exp_001_2026-10-28")
    const cipherFollowUpId = encodeURIComponent(
      CryptoJS.AES.encrypt(followUpId, this.ENCRYPTION_KEY).toString(),
    );

    // 2. Ciframos el ID del paciente
    const cipherpatientId = encodeURIComponent(
      CryptoJS.AES.encrypt(this.patientId() || '', this.ENCRYPTION_KEY).toString(),
    );

    // 3. (Opcional pero recomendado) Si el expedienteId es fijo o viene estructurado, lo ciframos también.
    // Si tu estructura usa "exp_001" por defecto, puedes pasarlo o extraerlo del item.
    const expedienteId =
      this.historyBoard().find((item) => item.id === followUpId)?.expedienteId || 'exp_001';
    const cipherExpedienteId = encodeURIComponent(
      CryptoJS.AES.encrypt(expedienteId, this.ENCRYPTION_KEY).toString(),
    );

    // Navegamos enviando los tres parámetros cifrados a la ruta de detalle
    this.router.navigate([
      '/expediente/detail',
      cipherpatientId,
      cipherExpedienteId,
      cipherFollowUpId,
    ]);
  }

  volverAlListado() {
    this.router.navigate(['/pacientes']);
  }

  getSmallThumbnail(originalUrl: string): string {
    try {
      // 1. Tomamos la URL firmada original y le quitamos los parámetros de firma (?X-Goog-...)
      const baseUrl = originalUrl.split('?')[0];

      // 2. Encontramos la última barra para separar la ruta del archivo y el nombre
      const lastIndex = baseUrl.lastIndexOf('/');
      if (lastIndex === -1) return originalUrl;

      const folder = baseUrl.substring(0, lastIndex + 1);
      const fileName = baseUrl.substring(lastIndex + 1);

      const extIndex = fileName.lastIndexOf('.');
      if (extIndex === -1) return originalUrl;

      const nameWithoutExt = fileName.substring(0, extIndex);
      const ext = fileName.substring(extIndex);

      // 3. Construimos la URL limpia apuntando al thumbnail pequeño SIN alterar firmas ajenas
      // (O bien, si usas urls públicas / firmadas de otra forma, ajustas aquí)
      const thumbnailPath = `${folder}thumbnails/${nameWithoutExt}_small${ext}`;

      // Si tus miniaturas son públicas o usas URLs públicas directas:
      return thumbnailPath;
    } catch (e) {
      return originalUrl;
    }
  }

  onImageError(event: Event, originalUrl: string) {
    const imgElement = event.target as HTMLImageElement;
    // Evita bucles infinitos si la original también llegara a fallar
    if (imgElement.src !== originalUrl) {
      imgElement.src = originalUrl;
    }
  }

  // Método general para enviar los datos actualizados al backend
  private async persistPatientChanges() {
    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;
      if (!jwtToken) return;

      const updated = this.editablePatientData();

      // Actualizamos localmente el signal principal
      this.patientData.set({ ...updated });

      const payload = {
        idConsultorio: this.idConsultorio(),
        idPaciente: this.patientId(),
        fichaDeIdentificacion: {
          nombreCompleto: updated.fullName,
          telefono: updated.phone,
          correo: updated.email,
          calleNumero: updated.address,
          edad: updated.age,
          fechaNacimiento: updated.birthDate,
          sexo: updated.gender,
          contactoEmergencia: updated.emergencyContact,
          ocupacion: updated.occupation,
          actividadDeportiva: updated.sport,
          datosFiscales: updated.fiscalData,
        },
      };

      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        this.ENCRYPTION_KEY,
      ).toString();

      // Aquí realizas tu petición HTTP POST para guardar en el backend
      await this.tokenInterceptor.authenticatedFetch(API_URLS.UPDATE_PATIENT_DEMOGRAPHICS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
      });
    } catch (err) {
      console.error('❌ Error al guardar los cambios del paciente:', err);
      alert('No se pudieron guardar los cambios.');
    }
  }
}
