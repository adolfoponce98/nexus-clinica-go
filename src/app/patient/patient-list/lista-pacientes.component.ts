import { DirectorySkeletonComponent } from '../../shared/directory-skeleton.component';
import { CreationAccessService } from '../../planes/creation-access.service';
import { PlanUsageComponent } from '../../planes/plan-usage.component';
import { BillingService } from '../../planes/billing.service';
import { RegistrationLinkComponent } from '../../patient-registration/registration-link.component';
import { PatientIntakeComponent } from '../../clinical/patient-intake.component';
import { PermissionService } from '../../auth/permission.service';
import { patientSummary } from '../patient-summary';
import { PermissionDirective } from '../../auth/permission.directive';
import { Subscription } from 'rxjs';
import { versionedFetch } from '../../auth/sync-cache';
import { SECURITY_CONFIG } from '../../config/security.config';
import { API_URLS } from '../../config/api-urls';
import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule,
  Search,
  Filter,
  Phone,
  Mail,
  FileText,
  UserCheck,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Stethoscope,
  Plus,
  Loader2,
  Droplet,
  BookOpen,
} from 'lucide-angular';
import { AuthService } from '../../auth/auth.service';
import { TokenInterceptorService } from '../../auth/token-interceptor.service';

import * as CryptoJS from 'crypto-js';

export interface Paciente {
  id: string;
  idPaciente?: string;
  nombre: string;
  telefono: string;
  correo: string;
  expedienteNum: string;
  categoriaConsulta: string;
  ultimoMotivo?: string;
  ultimaVisita: string;
  numeroVisitas: number;
  esPrimeraVez: boolean;
  edad: number;
  sexo: string;
}

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [
    DirectorySkeletonComponent,
    PlanUsageComponent,
    RegistrationLinkComponent,
    PatientIntakeComponent,
    PermissionDirective,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: 'lista-pacientes.component.html',
})
export class ListaPacientesComponent implements OnInit {
  readonly billing = inject(BillingService);
  private readonly creationAccess = inject(CreationAccessService);

  private router = inject(Router);
  private tokenInterceptor = inject(TokenInterceptorService);
  private authService = inject(AuthService);

  readonly icons = {
    Search,
    Filter,
    Phone,
    Mail,
    FileText,
    UserCheck,
    Calendar,
    ArrowUpDown,
    ChevronRight,
    Stethoscope,
    Plus,
    Loader2,
    Droplet,
    BookOpen,
  };

  // 🔐 URLs de Cloud Functions y credenciales de seguridad
  private readonly GET_PATIENTS_URL = API_URLS.GETPATIENTS;
  private readonly EXTRACT_RECORD_URL = API_URLS.EXTRACTEXPEDIENT;
  private registrationRequestId = crypto.randomUUID();
  private readonly SAVE_RECORD_URL = API_URLS.REGISTERNEWPATIENT; // Ajusta si tu endpoint difiere
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;

  // Parámetro dinámico del consultorio
  idConsultorio = signal<string>('');

  // Estados reactivos con Signals
  searchQuery = signal('');
  lastVisitFilter = signal('TODAS');
  selectedVisitsFilter = signal('TODOS');
  sortBy = signal<'recientes' | 'visitas' | 'motivo' | 'nombre'>('recientes');

  isLoading = signal<boolean>(true);
  pacientes = signal<Paciente[]>([]);

  // Estados para el flujo de importación por IA
  showImportModal = signal<boolean>(false);
  showFormModal = signal<boolean>(false);
  showSuccessModal = signal<boolean>(false);
  selectedImportFile = signal<File | null>(null);
  importPreviewUrl = signal<string | null>(null);
  isExtractingAI = signal<boolean>(false);
  isSavingRecord = signal<boolean>(false);

  // Listas de apoyo para la UI
  sexosList = ['Masculino', 'Femenino', 'Otro'];
  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  // Variables para fecha de nacimiento dividida
  diaNac = '';
  mesNac = '';
  anioNac = '';

  // Formulario reactivo para la ficha de identificación importada
  importForm = new FormGroup({
    numeroExpediente: new FormControl(''),
    nombreCompleto: new FormControl('', Validators.required),
    sexo: new FormControl(''),
    tipoSangre: new FormControl(''),
    religion: new FormControl(''),
    telefono: new FormControl('', [Validators.pattern(/^[0-9]{10}$/)]),
    celular: new FormControl('', [Validators.pattern(/^[0-9]{10}$/)]),
    correo: new FormControl('', [Validators.email]),
    calleNumero: new FormControl(''),
    coloniaCiudad: new FormControl(''),
    ocupacion: new FormControl(''),
    actividadDeportiva: new FormControl(''),
    contactoEmergencia: new FormControl(''),
    datosFiscales: new FormControl(''),
  });

  private readonly permissions = inject(PermissionService);
  private syncPatients?: Subscription;
  private branchSub?: Subscription;
  private loadSerial = 0;
  readonly loadError = signal('');
  ngOnDestroy() {
    this.loadSerial++;
    this.syncPatients?.unsubscribe();
    this.branchSub?.unsubscribe();
  }
  ngOnInit() {
    this.syncPatients = this.authService.patientsUpdated$.subscribe(() =>
      this.pacientes.set(this.authService.getCachedPatients()),
    );
    this.branchSub = this.authService.branchChanged$.subscribe((id) => {
      this.pacientes.set([]);
      this.idConsultorio.set(id);
      void this.cargarPacientes(id);
    });
    const branch = this.authService.getSucursal(),
      office = branch?.idConsultorio || branch?.id;
    this.idConsultorio.set(office || '');
    if (office) void this.cargarPacientes(office);
    else this.isLoading.set(false);
  }

  async cargarPacientes(consultorioId: string) {
    const serial = ++this.loadSerial,
      session = this.authService.getSession();
    this.loadError.set('');
    this.pacientes.set(this.authService.getCachedPatients());
    if (!consultorioId || !this.permissions.can('patients', 'read')) {
      this.isLoading.set(false);
      return;
    }
    this.isLoading.set(true);
    try {
      const response = await this.tokenInterceptor.executeWithAuth((token) => {
        const encryptedData = CryptoJS.AES.encrypt(
          JSON.stringify({ idConsultorio: consultorioId }),
          this.ENCRYPTION_KEY,
        ).toString();
        return versionedFetch(this.GET_PATIENTS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ encryptedData }),
        });
      });
      const envelope = await response.json(),
        data = envelope.encryptedData
          ? JSON.parse(
              CryptoJS.AES.decrypt(envelope.encryptedData, this.ENCRYPTION_KEY).toString(
                CryptoJS.enc.Utf8,
              ),
            )
          : envelope;
      if (serial !== this.loadSerial) return;
      const branch = this.authService.getSucursal(),
        current = this.authService.getSession();
      if (
        (branch?.idConsultorio || branch?.id) !== consultorioId ||
        current?.email !== session?.email ||
        current?.idDoctor !== session?.idDoctor ||
        current?.sessionId !== session?.sessionId
      )
        return;
      if (!response.ok || !data.success || !Array.isArray(data.patients))
        throw new Error(data.error || 'No se pudieron cargar los pacientes.');
      const list = data.patients.map(patientSummary);
      this.pacientes.set(list);
      this.authService.saveCachedPatients(list, data.lastUpdated);
    } catch (error) {
      if (serial === this.loadSerial)
        this.loadError.set(
          error instanceof Error ? error.message : 'No se pudieron cargar los pacientes.',
        );
    } finally {
      if (serial === this.loadSerial) this.isLoading.set(false);
    }
  }

  // 📂 Métodos para la Importación de Expedientes con IA
  abrirModalImportar() {
    this.selectedImportFile.set(null);
    this.importPreviewUrl.set(null);
    this.importForm.reset();
    this.diaNac = '';
    this.mesNac = '';
    this.anioNac = '';
    this.showImportModal.set(true);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Formato no válido. Solo se permiten imágenes (JPEG, PNG) o archivos PDF.');
      return;
    }

    this.selectedImportFile.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.importPreviewUrl.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async extraerInformacionIA() {
    if (!this.billing.allows('ai') || !this.billing.state()?.aiCredits) {
      alert('La importación IA requiere una suscripción activa y créditos disponibles.');
      return;
    }
    const file = this.selectedImportFile();
    if (!file) {
      console.warn('⚠️ No hay ningún archivo seleccionado para extraer.');
      return;
    }

    console.log('--- 🚀 1. INICIANDO EXTRACCIÓN CON IA ---');
    console.log(
      'Archivo seleccionado:',
      file.name,
      'Tipo:',
      file.type,
      'Tamaño:',
      file.size,
      'bytes',
    );

    this.isExtractingAI.set(true);

    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken || '';
      console.log(
        '2. Token JWT obtenido:',
        jwtToken ? 'Presente (longitud: ' + jwtToken.length + ')' : 'NO HAY TOKEN',
      );

      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          console.log(
            '3. Archivo convertido a Base64 correctamente. Longitud del string:',
            base64String.length,
          );

          const payload = {
            imageBase64: base64String,
            mimeType: file.type,
          };

          console.log('4. Encriptando payload con AES...');
          const ciphertext = CryptoJS.AES.encrypt(
            JSON.stringify(payload),
            this.ENCRYPTION_KEY,
          ).toString();

          console.log('5. Enviando petición POST a la Cloud Function:', this.EXTRACT_RECORD_URL);
          const response = await this.tokenInterceptor.authenticatedFetch(this.EXTRACT_RECORD_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-app-signature': this.APP_SECRET_HEADER,
              'x-client-source': 'angular',
              Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({ encryptedData: ciphertext }),
          });

          console.log('6. Respuesta HTTP recibida. Status:', response.status, response.statusText);
          const jsonRes = await response.json();
          console.log('7. JSON crudo devuelto por el servidor (encriptado):', jsonRes);

          if (!response.ok) {
            throw new Error(jsonRes.error || 'Error al conectar con el servidor.');
          }

          if (!jsonRes.encryptedData) {
            throw new Error('El servidor respondió OK pero no devolvió el campo "encryptedData".');
          }

          let decryptedResponse;
          try {
            console.log('8. Desencriptando respuesta del servidor...');
            const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            console.log('9. String desencriptado:', decryptedString);

            decryptedResponse = JSON.parse(decryptedString);
            console.log('10. Objeto JSON desencriptado final:', decryptedResponse);
          } catch (err) {
            console.error('❌ Error al desencriptar la respuesta:', err);
            throw new Error('Fallo al desencriptar la respuesta de la IA.');
          }

          if (decryptedResponse.success && decryptedResponse.patientData) {
            const d = decryptedResponse.patientData;
            console.log('✅ Datos del paciente extraídos con éxito por la IA:', d);

            // Separar fecha de nacimiento
            if (d.fecha_nacimiento) {
              console.log('11. Procesando fecha de nacimiento detectada:', d.fecha_nacimiento);
              const partes = d.fecha_nacimiento.split(/[-/]/);
              if (partes.length === 3) {
                if (partes[0].length === 4) {
                  this.anioNac = partes[0];
                  this.mesNac = partes[1];
                  this.diaNac = partes[2];
                } else {
                  this.diaNac = partes[0];
                  this.mesNac = partes[1];
                  this.anioNac = partes[2];
                }
                console.log(
                  `Fecha parseada -> Día: ${this.diaNac}, Mes: ${this.mesNac}, Año: ${this.anioNac}`,
                );
              }
            } else {
              console.warn('⚠️ La IA no encontró la fecha de nacimiento o vino vacía.');
            }

            console.log('12. Rellenando formulario reactivo (importForm)...');
            this.importForm.patchValue({
              numeroExpediente: d.numero_expediente || '',
              nombreCompleto: d.nombre || '',
              sexo: d.sexo || '',
              tipoSangre: d.tipo_sangre || '',
              religion: d.religion || '',
              telefono: d.telefono || '',
              celular: d.telefono || '',
              correo: d.correo || '',
              calleNumero: d.domicilio || '',
              ocupacion: d.ocupacion || '',
            });

            console.log(
              '13. Cerrando modal de importación y abriendo el modal de validación del formulario.',
            );
            this.showImportModal.set(false);
            this.showFormModal.set(true);
          } else {
            console.error(
              '❌ La IA respondió success: false o no traía patientData:',
              decryptedResponse,
            );
            throw new Error(
              decryptedResponse.error || 'No se pudieron extraer los datos del expediente.',
            );
          }
        } catch (innerError: any) {
          console.error('❌ Error dentro del FileReader / Proceso de fetch:', innerError);
          alert(innerError.message || 'Error procesando el archivo.');
        } finally {
          this.isExtractingAI.set(false);
          console.log('--- FIN DE EXTRACCIÓN CON IA ---');
        }
      };

      reader.onerror = (fileError) => {
        console.error('❌ Error leyendo el archivo con FileReader:', fileError);
        alert('No se pudo leer el archivo seleccionado.');
        this.isExtractingAI.set(false);
      };
    } catch (error: any) {
      console.error('❌ Excepción general en extraerInformacionIA:', error);
      alert(error.message || 'Hubo un error al procesar el archivo.');
      this.isExtractingAI.set(false);
    }
  }

  async guardarFichaImportada() {
    if (this.importForm.invalid) {
      alert('Por favor completa los campos requeridos (Nombre Completo).');
      return;
    }

    this.isSavingRecord.set(true);

    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        alert('Sesión expirada.');
        this.router.navigate(['/login']);
        return;
      }

      const idDoctor =
        sessionData.idDoctor || sessionData.email
          ? (sessionData.idDoctor || sessionData.email)
              .trim()
              .toLowerCase()
              .replace(/[\/\\]/g, '_')
          : 'default_doctor';
      const formVal = this.importForm.value;

      const rawData = {
        idDoctor: idDoctor,
        idConsultorio: this.idConsultorio(),
        referenciaExpedienteFisico: formVal.numeroExpediente || '',
        requestId: this.registrationRequestId,
        fichaDeIdentificacion: {
          nombreCompleto: formVal.nombreCompleto,
          sexo: formVal.sexo,
          tipoSangre: formVal.tipoSangre,
          religion: formVal.religion,
          telefono: formVal.telefono,
          celular: formVal.celular,
          correo: formVal.correo,
          calleNumero: formVal.calleNumero,
          coloniaCiudad: formVal.coloniaCiudad,
          ocupacion: formVal.ocupacion,
          actividadDeportiva: formVal.actividadDeportiva,
          contactoEmergencia: formVal.contactoEmergencia,
          datosFiscales: formVal.datosFiscales,
          fechaNacimiento: `${this.diaNac}/${this.mesNac}/${this.anioNac}`,
          alergias: [],
        },
      };

      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(rawData),
        this.ENCRYPTION_KEY,
      ).toString();

      const response = await this.tokenInterceptor.authenticatedFetch(this.SAVE_RECORD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al guardar el expediente.');
      }

      const saved = JSON.parse(
        CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY).toString(
          CryptoJS.enc.Utf8,
        ),
      );
      if (!saved.success) throw new Error(saved.error || 'No se pudo guardar el expediente.');
      this.registrationRequestId = crypto.randomUUID();
      this.showFormModal.set(false);
      this.showSuccessModal.set(true);
      this.cargarPacientes(this.idConsultorio());
    } catch (err: any) {
      console.error('Error al guardar:', err);
      alert(err.message || 'Error de conexión.');
    } finally {
      this.isSavingRecord.set(false);
    }
  }

  // Pacientes filtrados y ordenados mediante Computed Signals
  filteredPacientes = computed(() => {
    const query = this.searchQuery().toLocaleLowerCase('es').trim(),
      visit = this.selectedVisitsFilter(),
      date = this.lastVisitFilter();
    const list = this.pacientes().filter((p) => {
      if (query && !p.nombre.toLocaleLowerCase('es').includes(query)) return false;
      if (
        (visit === 'PRIMERA_VEZ' && !p.esPrimeraVez) ||
        (visit === 'MULTIPLE_VISITAS' && p.numeroVisitas === 0)
      )
        return false;
      if (date === 'NUNCA') return !p.ultimaVisita;
      if (date !== 'TODAS') {
        const age = Date.now() - new Date(p.ultimaVisita + 'T00:00:00').getTime();
        return age >= 0 && age <= Number(date) * 86400000;
      }
      return true;
    });
    return list.sort((a, b) =>
      this.sortBy() === 'motivo'
        ? (a.ultimoMotivo || '').localeCompare(b.ultimoMotivo || '', 'es')
        : this.sortBy() === 'nombre'
          ? a.nombre.localeCompare(b.nombre, 'es')
          : this.sortBy() === 'visitas'
            ? b.numeroVisitas - a.numeroVisitas
            : b.ultimaVisita.localeCompare(a.ultimaVisita),
    );
  });

  verDetalleExpediente(paciente: Paciente) {
    if (paciente && paciente.id) {
      const ciphertext = CryptoJS.AES.encrypt(paciente.id, this.ENCRYPTION_KEY).toString();
      const safeUrlId = btoa(ciphertext);
      this.router.navigate(['/expediente', safeUrlId]);
    }
  }

  nuevoExpediente() {
    if (!this.permissions.can('records', 'write') || !this.creationAccess.allow('patients')) return;
    this.router.navigate(['/expediente/nuevo'], {
      queryParams: { idConsultorio: this.idConsultorio() },
    });
  }
}
