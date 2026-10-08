import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  LucideAngularModule, Search, Filter, Phone, Mail, FileText,
  UserCheck, Calendar, ArrowUpDown, ChevronRight, Stethoscope, Plus, Loader2, Droplet, BookOpen
} from 'lucide-angular';
import { AuthService } from '../../auth/auth.service';
import * as CryptoJS from 'crypto-js';

export interface Paciente {
  id: string;
  idPaciente?: string;
  nombre: string;
  telefono: string;
  correo: string;
  expedienteNum: string;
  categoriaConsulta: string;
  ultimaVisita: string;
  numeroVisitas: number;
  esPrimeraVez: boolean;
  edad: number;
  sexo: string;
}

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: 'lista-pacientes.component.html'
})
export class ListaPacientesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  readonly icons = {
    Search, Filter, Phone, Mail, FileText,
    UserCheck, Calendar, ArrowUpDown, ChevronRight, Stethoscope, Plus, Loader2, Droplet, BookOpen
  };

  // 🔐 URLs de Cloud Functions y credenciales de seguridad
  private readonly GET_PATIENTS_URL = 'https://getpatients-o7vmreizjq-uc.a.run.app';
  private readonly EXTRACT_RECORD_URL = 'https://extractexpedient-o7vmreizjq-uc.a.run.app';
  private readonly SAVE_RECORD_URL = 'https://savepatientrecord-o7vmreizjq-uc.a.run.app'; // Ajusta si tu endpoint difiere
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  // Parámetro dinámico del consultorio
  idConsultorio = signal<string>('');

  // Estados reactivos con Signals
  searchQuery = signal('');
  selectedCategory = signal('TODAS');
  selectedVisitsFilter = signal('TODOS');
  sortBy = signal<'recientes' | 'visitas'>('recientes');

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
    datosFiscales: new FormControl('')
  });

  categorias = ['TODAS', 'Traumatología', 'Medicina General', 'Cardiología', 'Nutrición'];

  ngOnInit() {
    const defaultOffice = this.authService.getSucursal();
    this.idConsultorio.set(defaultOffice.idConsultorio || 'consultorio_general');
    this.cargarPacientes(this.idConsultorio());
  }

  // 🚀 MÉTODO PARA CARGAR LOS PACIENTES
  async cargarPacientes(consultorioId: string) {
    try {
      this.isLoading.set(true);
      const sessionData = this.authService.getSession();
      let jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        this.router.navigate(['/login']);
        return;
      }

      const lastSync = this.authService.getLastSyncDatePatients();

      const fetchPacientes = async (token: string) => {
        const payload = {
          idConsultorio: consultorioId,
          ultimaSincronizacion: lastSync
        };
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        return await fetch(this.GET_PATIENTS_URL, {
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

      let response = await fetchPacientes(jwtToken);

      // Manejo de expiración de Token (401)
      if (response.status === 401) {
        const refreshTokenValue = sessionData?.sessionToken;
        if (!refreshTokenValue) {
          this.router.navigate(['/login']);
          return;
        }

        const refreshPayload = { refreshToken: refreshTokenValue };
        const refreshCiphertext = CryptoJS.AES.encrypt(JSON.stringify(refreshPayload), this.ENCRYPTION_KEY).toString();

        const refreshResponse = await fetch('https://refreshtoken-o7vmreizjq-uc.a.run.app', {
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
          response = await fetchPacientes(jwtToken);
        } else {
          this.router.navigate(['/login']);
          return;
        }
      }

      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Error al obtener los pacientes.');
      }

      const jsonRes = await response.json();
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedData.success && Array.isArray(decryptedData.patients)) {
        const listaMapeada: Paciente[] = decryptedData.patients.map((p: any) => {
          const ficha = p.fichaDeIdentificacion || {};
          const numVisitas = p.contadorDeVisitas || 1;
          return {
            id: p.idPaciente || '',
            nombre: ficha.nombreCompleto || p.nombre || 'Sin nombre',
            telefono: ficha.telefono || p.telefono || 'Sin teléfono',
            correo: ficha.correo || 'Sin correo',
            expedienteNum: p.numeroDeExpediente || 'EXP-2026-0000',
            categoriaConsulta: p.categoria || 'Medicina General',
            ultimaVisita: p.ultimaVisita ? p.ultimaVisita.split('T')[0] : '2026-10-07',
            numeroVisitas: numVisitas,
            esPrimeraVez: numVisitas === 1,
            edad: ficha.edad || 0,
            sexo: ficha.sexo || 'No especificado'
          };
        });

        this.pacientes.set(listaMapeada);

        if (listaMapeada.length > 0) {
          this.authService.saveCachedPatients(listaMapeada);
        }
      }
    } catch (err) {
      console.error('❌ Error en cargarPacientes:', err);
    } finally {
      this.isLoading.set(false);
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
  const file = this.selectedImportFile();
  if (!file) {
    console.warn('⚠️ No hay ningún archivo seleccionado para extraer.');
    return;
  }

  console.log('--- 🚀 1. INICIANDO EXTRACCIÓN CON IA ---');
  console.log('Archivo seleccionado:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size, 'bytes');

  this.isExtractingAI.set(true);

  try {
    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken || '';
    console.log('2. Token JWT obtenido:', jwtToken ? 'Presente (longitud: ' + jwtToken.length + ')' : 'NO HAY TOKEN');

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        console.log('3. Archivo convertido a Base64 correctamente. Longitud del string:', base64String.length);

        const payload = {
          imageBase64: base64String,
          mimeType: file.type
        };

        console.log('4. Encriptando payload con AES...');
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        console.log('5. Enviando petición POST a la Cloud Function:', this.EXTRACT_RECORD_URL);
        const response = await fetch(this.EXTRACT_RECORD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ encryptedData: ciphertext })
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
              console.log(`Fecha parseada -> Día: ${this.diaNac}, Mes: ${this.mesNac}, Año: ${this.anioNac}`);
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

          console.log('13. Cerrando modal de importación y abriendo el modal de validación del formulario.');
          this.showImportModal.set(false);
          this.showFormModal.set(true);
        } else {
          console.error('❌ La IA respondió success: false o no traía patientData:', decryptedResponse);
          throw new Error(decryptedResponse.error || 'No se pudieron extraer los datos del expediente.');
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

      const idDoctor = sessionData.email ? sessionData.email.trim().toLowerCase().replace(/[\/\\]/g, "_") : 'default_doctor';
      const formVal = this.importForm.value;

      const rawData = {
        idDoctor: idDoctor,
        idConsultorio: this.idConsultorio(),
        numeroDeExpediente: formVal.numeroExpediente || `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
          alergias: []
        }
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(rawData), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.SAVE_RECORD_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al guardar el expediente.');
      }

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
    let lista = this.pacientes();
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();
    const visitFilter = this.selectedVisitsFilter();
    const sort = this.sortBy();

    if (query) {
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.expedienteNum.toLowerCase().includes(query)
      );
    }

    if (cat !== 'TODAS') {
      lista = lista.filter(p => p.categoriaConsulta === cat);
    }

    if (visitFilter === 'PRIMERA_VEZ') {
      lista = lista.filter(p => p.esPrimeraVez);
    } else if (visitFilter === 'MULTIPLE_VISITAS') {
      lista = lista.filter(p => p.numeroVisitas > 1);
    }

    return lista.sort((a, b) => {
      if (sort === 'recientes') {
        return new Date(b.ultimaVisita).getTime() - new Date(a.ultimaVisita).getTime();
      } else {
        return b.numeroVisitas - a.numeroVisitas;
      }
    });
  });

  verDetalleExpediente(paciente: Paciente) {
    if (paciente && paciente.id) {
      const ciphertext = CryptoJS.AES.encrypt(paciente.id, this.ENCRYPTION_KEY).toString();
      const safeUrlId = btoa(ciphertext);
      this.router.navigate(['/expediente', safeUrlId]);
    }
  }

  nuevoExpediente() {
    this.router.navigate(['/expediente/nuevo'], { queryParams: { idConsultorio: this.idConsultorio() } });
  }
}
