import { Component, signal, inject, computed, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import * as CryptoJS from 'crypto-js';

import { AuthService } from '../../auth/auth.service';
import {
  LucideAngularModule, User, ShieldAlert, FileText, Stethoscope,
  Image as ImageIcon, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
  Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save
} from 'lucide-angular';

@Component({
  selector: 'app-medical-record-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: 'medical-record-form.component.html'
})
export class MedicalRecordFormComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly icons = {
    User, ShieldAlert, FileText, Stethoscope,
    ImageIcon, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Check,
    Droplet, BookOpen, AlertTriangle, Phone, Smartphone, Mail, MapPin, X, Save
  };

  // 🔐 Credenciales de seguridad y endpoint
  private readonly SAVE_URL = 'https://registernewpatient-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  recordForm: FormGroup;

  // Listas desplegables
  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  religionsList = [
    'Católica', 'Cristiana / Evangélica', 'Judaica', 'Islamismo',
    'Budismo', 'Hinduismo', 'Testigo de Jehová', 'Mormona',
    'Sin Religión / Agnóstico', 'Ateo', 'Otra'
  ];

  sexosList = ['Masculino', 'Femenino', 'No binario', 'Género fluido', 'Prefiero no decirlo', 'Otro'];

  // Estados interactivos para campos especiales
  alergiasList = signal<string[]>([]);
  tempAlergiaInput = '';

  religionSearch = '';
  showReligionDropdown = false;
  filteredReligions = signal<string[]>(this.religionsList);

  // Inputs separados para fecha de nacimiento
  diaNac = '';
  mesNac = '';
  anioNac = '';

  // --- LÓGICA DE MODELOS 3D DINÁMICOS ---
  isLoadingModel = signal<boolean>(true);
  isExpanded = signal<boolean>(false);
  selectedModelId = signal<string>('modelo-1');
  huesoActivo = signal<string>('');

  traumaModels = [
    {
      id: 'modelo-1',
      name: 'pie',
      description: 'pie',
      thumbnail: 'assets/huesos/pie.png', // Reemplaza con tus rutas reales de miniatura
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_pie.glb?alt=media&token=dec3eb9f-bc43-4f97-87fa-510f22efa4d2' // Puedes cambiar o agregar tus GBLs específicos de traumatología
    },
    {
      id: 'modelo-2',
      name: 'Pierna',
      description: 'Pierna',
      thumbnail: 'assets/huesos/pierna.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_pierna.glb?alt=media&token=0e7f2398-2145-4066-8c2f-9f7c0f964ffb'
    },
    {
      id: 'modelo-3',
      name: 'Torso',
      description: 'Torso',
      thumbnail: 'assets/huesos/torso.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_torso.glb?alt=media&token=52fcae0c-1867-4c2b-8926-9ab0c75af6f6'
    },
    {
      id: 'modelo-4',
      name: 'Brazo',
      description: 'Brazo',
      thumbnail: 'assets/huesos/brazo.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fesqueleto_brazo.glb?alt=media&token=80be2fcc-7e53-4202-8cdc-f16d65265a80'
    },
    {
      id: 'modelo-5',
      name: 'Craneo',
      description: 'Craneo',
      thumbnail: 'assets/huesos/craneo.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2Fcraneo_humano-v1.glb?alt=media&token=049550bd-4976-4b02-bb50-ec6763348bf6'
    },
    {
      id: 'modelo-6',
      name: 'Esqueleto completo',
      description: 'Esqueleto completo',
      thumbnail: 'assets/huesos/esqueleto.png',
      src: 'https://firebasestorage.googleapis.com/v0/b/clinq-go.firebasestorage.app/o/gbl%2FMeshy_AI_Detailed_Male_Skeleto_1008020424_texture-v2.glb?alt=media&token=322a983e-d72d-4df2-904f-092a281ae58a'
    }
  ];
 activeTraumaModel = computed(() => {
    return this.traumaModels.find(m => m.id === this.selectedModelId()) || this.traumaModels[0];
  });

  selectModel(id: string) {
    if (this.selectedModelId() !== id) {
      this.isLoadingModel.set(true);
      this.selectedModelId.set(id);
    }
  }

  toggleExpand() {
    this.isExpanded.update(v => !v);
  }

  constructor() {
    this.recordForm = this.fb.group({
      // 1. Ficha de Identificación detallada
      nombreCompleto: ['', Validators.required],
      sexo: ['', Validators.required],
      tipoSangre: ['', Validators.required],
      religion: ['', Validators.required],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      celular: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      calleNumero: ['', Validators.required],
      coloniaCiudad: ['', Validators.required],
      ocupacion: [''],
      actividadDeportiva: [''],
      contactoEmergencia: [''],
      datosFiscales: [''],

      // 2. Antecedentes
      antecedentesTraumaticos: [''],
      enfermedadesCronicas: [''],
      habitos: [''],

      // 3. Padecimiento Actual
      mecanismoLesion: [''],
      tiempoEvolucion: ['Agudo (Menor a 48-72 hrs)'],
      intensidadDolor: [''],
      localizacionDolor: [''],
      tipoDolor: [''],
      sintomasAcompanantes: [''],

      // 4. Exploración Física
      inspeccion: [''],
      palpacion: [''],
      arcosMovilidad: [''],
      pruebasEspeciales: [''],

      // 5. Estudios de Imagen
      rxSimple: [''],
      resonanciaMagnetica: [''],
      tomografiaLabs: [''],

      // 6. Diagnóstico y Plan
      impresionDiagnostica: ['', Validators.required],
      planTerapeutico: ['', Validators.required],
      pronosticoIncapacidad: ['']
    });
  }

  onModelLoaded() {
    this.isLoadingModel.set(false);
    console.log('¡Modelo 3D cargado y renderizado con éxito!');
  }

  onModelError(event: any) {
    this.isLoadingModel.set(false);
    console.error('Error detallado de model-viewer:', event);
  }

  // --- LÓGICA DE ALERGIAS (Chips interactivos) ---
  onAlergiaInput(event: any) {
    const val: string = event.target.value;
    if (val.includes(',') || (val.includes(' ') && val.trim().length > 1)) {
      const parts = val.split(/[\s,]+/);
      parts.forEach(p => {
        const limpia = p.trim();
        if (limpia.length > 0 && !this.alergiasList().includes(limpia)) {
          this.alergiasList.update(list => [...list, limpia]);
        }
      });
      this.tempAlergiaInput = '';
      event.target.value = '';
    } else {
      this.tempAlergiaInput = val;
    }
  }

  agregarAlergiaManual() {
    const val = this.tempAlergiaInput.trim();
    if (val && !this.alergiasList().includes(val)) {
      this.alergiasList.update(list => [...list, val]);
      this.tempAlergiaInput = '';
    }
  }

  removerAlergia(alergia: string) {
    this.alergiasList.update(list => list.filter(item => item !== alergia));
  }

  // --- LÓGICA DE FECHA DE NACIMIENTO ---
  onDiaInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 2);
    this.diaNac = val;
    event.target.value = val;
    if (val.length === 2) {
      document.getElementById('mesInput')?.focus();
    }
  }

  onMesInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 2);
    this.mesNac = val;
    event.target.value = val;
    if (val.length === 2) {
      document.getElementById('anioInput')?.focus();
    }
  }

  onAnioInput(event: any) {
    let val = event.target.value.replace(/\D/g, '').substring(0, 4);
    this.anioNac = val;
    event.target.value = val;
  }

  // --- BUSCADOR DE RELIGIONES ---
  filterReligions(event: any) {
    const query = event.target.value.toLowerCase();
    this.religionSearch = query;
    this.recordForm.patchValue({ religion: query });
    this.filteredReligions.set(
      this.religionsList.filter(r => r.toLowerCase().includes(query))
    );
    this.showReligionDropdown = true;
  }

  selectReligion(rel: string) {
    this.religionSearch = rel;
    this.recordForm.patchValue({ religion: rel });
    this.showReligionDropdown = false;
  }

  // --- VALIDACIÓN DE TELÉFONO ---
  validarTelefono(event: any, controlName: string) {
    const val = event.target.value.replace(/\D/g, '').substring(0, 10);
    this.recordForm.get(controlName)?.setValue(val);
    event.target.value = val;
  }

  // 💡 Cálculo automático de completitud por sección
  isSection1Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.nombreCompleto && v.sexo && v.telefono && this.diaNac && this.mesNac && this.anioNac.length === 4);
  });

  isSection2Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.antecedentesTraumaticos || v.enfermedadesCronicas || v.habitos || this.alergiasList().length > 0);
  });

  isSection3Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.mecanismoLesion && v.intensidadDolor && v.localizacionDolor);
  });

  isSection4Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.inspeccion || v.palpacion || v.arcosMovilidad);
  });

  isSection5Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.rxSimple || v.resonanciaMagnetica || v.tomografiaLabs);
  });

  isSection6Completed = computed(() => {
    const v = this.recordForm.value;
    return !!(v.impresionDiagnostica && v.planTerapeutico);
  });

  tabs = computed(() => [
    { id: 1, name: 'Ficha de Identificación', icon: User, completed: this.isSection1Completed() },
    { id: 2, name: 'Antecedentes', icon: ShieldAlert, completed: this.isSection2Completed() },
    { id: 3, name: 'Padecimiento Actual', icon: FileText, completed: this.isSection3Completed() },
    { id: 4, name: 'Exploración Física', icon: Stethoscope, completed: this.isSection4Completed() },
    { id: 5, name: 'Estudios de Imagen', icon: ImageIcon, completed: this.isSection5Completed() },
    { id: 6, name: 'Diagnóstico y Plan', icon: CheckCircle, completed: this.isSection6Completed() }
  ]);

  completedPercentage = computed(() => {
    const sections = [
      this.isSection1Completed(),
      this.isSection2Completed(),
      this.isSection3Completed(),
      this.isSection4Completed(),
      this.isSection5Completed(),
      this.isSection6Completed()
    ];
    return Math.round((sections.filter(Boolean).length / 6) * 100);
  });

  completedSectionsCount = computed(() => {
    const sections = [
      this.isSection1Completed(),
      this.isSection2Completed(),
      this.isSection3Completed(),
      this.isSection4Completed(),
      this.isSection5Completed(),
      this.isSection6Completed()
    ];
    return sections.filter(Boolean).length;
  });

  activeTab = signal(1);

  setTab(tabId: number) {
    this.activeTab.set(tabId);
  }

  nextTab() {
    if (this.activeTab() < 6) {
      this.activeTab.update(t => t + 1);
    }
  }

  prevTab() {
    if (this.activeTab() > 1) {
      this.activeTab.update(t => t - 1);
    }
  }

  marcarHueso(nombre: string) {
    this.huesoActivo.set(nombre);
    const actual = this.recordForm.get('localizacionDolor')?.value || '';
    if (!actual.includes(nombre)) {
      this.recordForm.patchValue({
        localizacionDolor: actual ? `${actual}; ${nombre}` : nombre
      });
    }
  }

  // 🚀 MÉTODO DE ENVÍO ENCRIPTADO CON JWT Y ESTRUCTURA POR NODOS
  async saveRecord() {
    try {
      const sessionData = this.authService.getSession();
      console.log('Session Data:', sessionData);
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        alert('No se encontró una sesión activa o token válido. Por favor inicie sesión nuevamente.');
        return;
      }

      const idDoctor = sessionData.email ? sessionData.email.trim().toLowerCase().replace(/[\/\\]/g, "_") : 'default_doctor';
      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || 'default_consultorio';

      const formVal = this.recordForm.value;

      const rawData = {
        idDoctor: idDoctor,
        idConsultorio: idConsultorio,

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
          alergias: this.alergiasList()
        },

        antecedentes: {
          antecedentesTraumaticos: formVal.antecedentesTraumaticos,
          enfermedadesCronicas: formVal.enfermedadesCronicas,
          habitos: formVal.habitos
        },

        padecimientoActual: {
          mecanismoLesion: formVal.mecanismoLesion,
          tiempoEvolucion: formVal.tiempoEvolucion,
          intensidadDolor: formVal.intensidadDolor,
          localizacionDolor: formVal.localizacionDolor,
          tipoDolor: formVal.tipoDolor,
          sintomasAcompanantes: formVal.sintomasAcompanantes
        },

        exploracionFisica: {
          inspeccion: formVal.inspeccion,
          palpacion: formVal.palpacion,
          arcosMovilidad: formVal.arcosMovilidad,
          pruebasEspeciales: formVal.pruebasEspeciales
        },

        estudiosDeImagen: {
          rxSimple: formVal.rxSimple,
          resonanciaMagnetica: formVal.resonanciaMagnetica,
          tomografiaLabs: formVal.tomografiaLabs
        },

        diagnosticoYPlan: {
          impresionDiagnostica: formVal.impresionDiagnostica,
          planTerapeutico: formVal.planTerapeutico,
          pronosticoIncapacidad: formVal.pronosticoIncapacidad
        }
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(rawData), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.SAVE_URL, {
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
        throw new Error(jsonRes.error || 'Error al guardar el expediente en el servidor.');
      }

      alert('¡Expediente traumatológico guardado y registrado con éxito!');
    } catch (err: any) {
      console.error('Error en saveRecord:', err);
      alert(err.message || 'Error de conexión con el servidor.');
    }
  }
}
