import { MEXICO_OCCUPATIONS, MEXICO_RELIGIONS } from '../../shared/patient-catalogs-mexico';
import { MEXICO_STATES } from '../../shared/mexico.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  HEREDITARY_OPTIONS,
  PATHOLOGICAL_OPTIONS,
  NON_PATHOLOGICAL_OPTIONS,
} from '../../patient-registration/intake-fields';
import { PermissionService } from '../../auth/permission.service';
import { emptyClinicalCore } from '../../clinical/clinical-core.component';
import { AppointmentContextService } from '../../appointments/appointment-context.service';
import { PermissionDirective } from '../../auth/permission.directive';
import {
  Component,
  EventEmitter,
  Output,
  signal,
  inject,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import {
  LucideAngularModule,
  Calendar,
  UserRound,
  Users,
  HeartPulse,
  Activity,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Globe,
  Building2,
  FileText,
  Briefcase,
  GraduationCap,
  Heart,
  NotebookPen,
  Droplet,
  Wind,
  Gauge,
  Brain,
  Stethoscope,
  Syringe,
  Bone,
  Cigarette,
  Wine,
  Pill,
  Thermometer,
  Weight,
  Ruler,
  ArrowLeft,
  ArrowRight,
  Save,
  X,
  TriangleAlert,
  ChevronRight,
  Check,
} from 'lucide-angular';

@Component({
  selector: 'app-patient-identification',
  standalone: true,
  imports: [PermissionDirective, CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './patient-identification.component.html',
  styleUrl: './patient-identification.component.css',
})
export class PatientIdentificationComponent {
  readonly permissions = inject(PermissionService);
  get sectionCount() {
    return this.permissions.can('records', 'write') ? this.subTabs.length : 1;
  }
  private readonly appointmentContext = inject(AppointmentContextService);
  ngOnInit() {
    const data = this.appointmentContext.identificationPrefill();
    if (data)
      this.patientForm.patchValue(
        Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' && value.trim() === '-' ? '' : value,
          ]),
        ),
      );
  }
  @Output() savePatientData = new EventEmitter<any>();

  @ViewChild('validationDialog') private validationDialog?: ElementRef<HTMLDialogElement>;
  readonly issues = signal<{ key: string; label: string; message: string; tab: number }[]>([]);
  readonly saveError = signal('');
  readonly icons = {
    Calendar,
    UserRound,
    Users,
    HeartPulse,
    Activity,
    ShieldCheck,
    Phone,
    Mail,
    MapPin,
    Globe,
    Building2,
    FileText,
    Briefcase,
    GraduationCap,
    Heart,
    NotebookPen,
    Droplet,
    Wind,
    Gauge,
    Brain,
    Stethoscope,
    Syringe,
    Bone,
    Cigarette,
    Wine,
    Pill,
    Thermometer,
    Weight,
    Ruler,
    ArrowLeft,
    ArrowRight,
    Save,
    X,
    TriangleAlert,
    ChevronRight,
    Check,
  };
  readonly states = MEXICO_STATES;
  readonly today =
    new Date().getFullYear() +
    '-' +
    String(new Date().getMonth() + 1).padStart(2, '0') +
    '-' +
    String(new Date().getDate()).padStart(2, '0');
  readonly personalSections = [
    {
      title: 'Identidad del paciente',
      description: 'Solo los campos marcados con * son obligatorios.',
      icon: UserRound,
      fields: [
        { key: 'firstName', label: 'Nombre(s)', icon: UserRound, required: true },
        { key: 'paternalSurname', label: 'Apellido paterno', icon: UserRound, required: true },
        { key: 'maternalSurname', label: 'Apellido materno', icon: UserRound },
        {
          key: 'birthDate',
          label: 'Fecha de nacimiento',
          type: 'date',
          icon: Calendar,
          required: true,
        },
        { key: 'age', label: 'Edad', type: 'number', icon: Calendar, readonly: true },
        {
          key: 'gender',
          label: 'Sexo',
          icon: UserRound,
          options: ['Masculino', 'Femenino', 'Otro'],
        },
        { key: 'curp', label: 'CURP', icon: FileText, max: 18 },
      ],
    },
    {
      title: 'Datos de contacto',
      description: 'Opcionales. Captúralos si están disponibles.',
      icon: Phone,
      fields: [
        {
          key: 'cellphone',
          label: 'Celular',
          type: 'tel',
          icon: Phone,
          max: 10,
          placeholder: '10 dígitos',
        },
        {
          key: 'homePhone',
          label: 'Teléfono de casa',
          type: 'tel',
          icon: Phone,
          max: 10,
          placeholder: '10 dígitos',
        },
        {
          key: 'email',
          label: 'Correo electrónico',
          type: 'email',
          icon: Mail,
          placeholder: 'correo@ejemplo.com',
        },
      ],
    },
    {
      title: 'Domicilio',
      description: 'Dirección y ubicación del paciente.',
      icon: MapPin,
      fields: [
        { key: 'country', label: 'País', icon: Globe, options: ['México'] },
        { key: 'state', label: 'Estado', icon: Building2, options: [...MEXICO_STATES] },
        { key: 'municipality', label: 'Municipio / alcaldía', icon: Building2 },
        { key: 'streetAndNumber', label: 'Calle y número', icon: MapPin },
        { key: 'neighborhood', label: 'Colonia', icon: MapPin },
      ],
    },
    {
      title: 'Información adicional',
      description: 'Estos datos ayudan a conocer mejor al paciente.',
      icon: NotebookPen,
      fields: [
        {
          key: 'maritalStatus',
          label: 'Estado civil',
          icon: Heart,
          options: ['Soltero(a)', 'Casado(a)', 'Divorciado(a)', 'Viudo(a)', 'Unión libre'],
        },
        {
          key: 'educationLevel',
          label: 'Escolaridad',
          icon: GraduationCap,
          options: [
            'Primaria',
            'Secundaria',
            'Bachillerato',
            'Licenciatura',
            'Posgrado',
            'Ninguna',
          ],
        },
        { key: 'religion', label: 'Religión', icon: Users, options: [...MEXICO_RELIGIONS] },
        {
          key: 'occupation',
          label: 'Ocupación',
          icon: Briefcase,
          options: [...MEXICO_OCCUPATIONS],
        },
        {
          key: 'additionalNote',
          label: 'Observaciones generales',
          type: 'textarea',
          icon: NotebookPen,
        },
      ],
    },
  ] as {
    title: string;
    description: string;
    icon: any;
    fields: {
      key: string;
      label: string;
      icon: any;
      required?: boolean;
      type?: string;
      options?: string[];
      max?: number;
      readonly?: boolean;
      placeholder?: string;
    }[];
  }[];
  readonly lifestyleFields = [
    { key: 'housing', label: 'Vivienda', icon: Building2 },
    { key: 'hygiene', label: 'Higiene', icon: Droplet },
    { key: 'nutrition', label: 'Alimentación', icon: Heart },
    { key: 'physicalActivity', label: 'Actividad física', icon: Activity },
  ];
  optionIcon(key: string) {
    return (
      (
        {
          diabetes: Droplet,
          asthma: Wind,
          hypertension: Gauge,
          cancer: ShieldCheck,
          heartDisease: HeartPulse,
          mentalIllness: Brain,
          allergies: ShieldCheck,
          endocrine: Activity,
          liverDisease: Stethoscope,
          surgery: Stethoscope,
          hospitalization: Building2,
          trauma: Bone,
          allergy: ShieldCheck,
          transfusion: Droplet,
          smoking: Cigarette,
          alcoholism: Wine,
          toxicomania: Pill,
          immunizations: Syringe,
          ivsa: Heart,
        } as Record<string, any>
      )[key] || Stethoscope
    );
  }
  vitalIcon(key: string) {
    return (
      {
        temperature: Thermometer,
        systolic: Gauge,
        diastolic: Gauge,
        heartRate: HeartPulse,
        respiratoryRate: Wind,
        weight: Weight,
        heightCm: Ruler,
      } as Record<string, any>
    )[key];
  }
  invalid(key: string) {
    const control = this.patientForm.get(key);
    return !!control?.invalid && control.touched;
  }
  fieldError(key: string) {
    const control = this.patientForm.get(key);
    if (control?.hasError('required')) return 'Completa este campo obligatorio.';
    if (control?.hasError('birthDate')) return 'Ingresa una fecha válida que no sea futura.';
    if (control?.hasError('email')) return 'Escribe un correo electrónico válido.';
    if (control?.hasError('pattern')) return 'Ingresa 10 dígitos, sin espacios ni guiones.';
    return 'Revisa el formato de este dato.';
  }

  // Control de las pestañas internas
  activeSubTab = signal<number>(1);
  subTabs = [
    { id: 1, name: 'Datos personales', hint: 'Identidad y contacto', icon: UserRound },
    { id: 2, name: 'Heredofamiliares', hint: 'Antecedentes familiares', icon: Users },
    { id: 3, name: 'Patológicos', hint: 'Historial de salud', icon: ShieldCheck },
    { id: 4, name: 'No patológicos', hint: 'Hábitos y estilo de vida', icon: Heart },
    { id: 5, name: 'Signos vitales', hint: 'Mediciones disponibles', icon: HeartPulse },
  ];

  birthDay = signal('');
  birthMonth = signal('');
  birthYear = signal('');

  hereditaryOptions = HEREDITARY_OPTIONS;

  pathologicalOptions = PATHOLOGICAL_OPTIONS;

  nonPathologicalOptions = NON_PATHOLOGICAL_OPTIONS;

  vitalFields = [
    { key: 'temperature', label: 'Temperatura', unit: '°C', min: 25, max: 45 },
    { key: 'systolic', label: 'Tensión sistólica', unit: 'mmHg', min: 20, max: 350 },
    { key: 'diastolic', label: 'Tensión diastólica', unit: 'mmHg', min: 10, max: 250 },
    { key: 'heartRate', label: 'Frecuencia cardiaca', unit: 'lpm', min: 10, max: 300 },
    { key: 'respiratoryRate', label: 'Frecuencia respiratoria', unit: 'rpm', min: 1, max: 120 },
    { key: 'weight', label: 'Peso', unit: 'kg', min: 0.2, max: 700 },
    { key: 'heightCm', label: 'Talla', unit: 'cm', min: 20, max: 260 },
  ];

  patientForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.patientForm = this.fb.group({
      firstName: [
        '',
        (control: AbstractControl) =>
          String(control.value ?? '').trim() ? null : { required: true },
      ],
      paternalSurname: [
        '',
        (control: AbstractControl) =>
          String(control.value ?? '').trim() ? null : { required: true },
      ],
      maternalSurname: [''],
      birthDate: [
        '',
        [
          Validators.required,
          (control: AbstractControl): ValidationErrors | null => {
            const value = String(control.value || '');
            if (!value) return null;
            const date = new Date(value + 'T12:00:00Z');
            return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
              Number.isFinite(date.getTime()) &&
              date.toISOString().slice(0, 10) === value &&
              value <= this.today
              ? null
              : { birthDate: true };
          },
        ],
      ],
      age: [{ value: '', disabled: false }],
      gender: [''],
      curp: [''],
      cellphone: ['', [Validators.pattern(/^\d{10}$/)]],
      homePhone: ['', [Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email]],
      streetAndNumber: [''],
      neighborhood: [''],
      municipality: [''],
      state: [''],
      country: [''],
      maritalStatus: [''],
      educationLevel: [''],
      religion: [''],
      occupation: [''],
      additionalNote: [''],

      familyBackground: this.fb.group({
        diabetes: [false],
        asthma: [false],
        hypertension: [false],
        cancer: [false],
        heartDisease: [false],
        mentalIllness: [false],
        allergies: [false],
        endocrine: [false],
        liverDisease: [false],
      }),
      familyBackgroundOther: [''],
      familyBackgroundDetails: [''],

      pathologicalBackground: this.fb.group({
        surgery: [false],
        hospitalization: [false],
        trauma: [false],
        allergy: [false],
        transfusion: [false],
        diabetes: [false],
        endocrine: [false],
        hypertension: [false],
        heartDisease: [false],
        cancer: [false],
      }),
      pathologicalBackgroundOther: [''],
      allergyDetails: [''],
      priorTreatments: [''],

      nonPathologicalBackground: this.fb.group({
        smoking: [false],
        alcoholism: [false],
        toxicomania: [false],
        immunizations: [false],
        ivsa: [false],
      }),
      nonPathologicalBackgroundOther: [''],
      housing: [''],
      hygiene: [''],
      nutrition: [''],
      physicalActivity: [''],
      vitals: this.fb.group(
        Object.fromEntries(
          this.vitalFields.map((field) => [
            field.key,
            [null, [Validators.min(field.min), Validators.max(field.max)]],
          ]),
        ),
      ),
    });
    this.patientForm
      .get('birthDate')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => this.calculateAge(value));
    this.patientForm
      .get('country')!
      .valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value) => {
        if (value !== 'México') this.patientForm.get('state')!.setValue('');
      });
  }

  normalizePhone(key: string, event: Event) {
    if (key !== 'cellphone' && key !== 'homePhone') return;
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = value;
    this.patientForm.get(key)!.setValue(value);
  }
  pastePhone(key: string, event: ClipboardEvent) {
    if (key !== 'cellphone' && key !== 'homePhone') return;
    const pasted = event.clipboardData?.getData('text');
    if (pasted === undefined) return;
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const digits = pasted.replace(/\D/g, '');
    const value = (
      input.value.slice(0, input.selectionStart ?? 0) +
      digits +
      input.value.slice(input.selectionEnd ?? input.value.length)
    )
      .replace(/\D/g, '')
      .slice(0, 10);
    input.value = value;
    this.patientForm.get(key)!.setValue(value);
    this.patientForm.get(key)!.markAsDirty();
  }

  nextSubTab() {
    if (this.activeSubTab() < this.sectionCount) {
      this.activeSubTab.update((t) => t + 1);
    }
  }

  prevSubTab() {
    if (this.activeSubTab() > 1) {
      this.activeSubTab.update((t) => t - 1);
    }
  }

  onDateInput(type: 'day' | 'month' | 'year', event: any, nextInput?: HTMLInputElement) {
    const val = event.target.value.replace(/\D/g, '');
    if (type === 'day') {
      this.birthDay.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (type === 'month') {
      this.birthMonth.set(val);
      if (val.length === 2 && nextInput) nextInput.focus();
    } else if (type === 'year') {
      this.birthYear.set(val);
    }
    this.updateComposedDate();
  }

  onCalendarChange(event: any) {
    const dateVal = event.target.value;
    if (dateVal) {
      const [y, m, d] = dateVal.split('-');
      this.birthYear.set(y);
      this.birthMonth.set(m);
      this.birthDay.set(d);
      this.updateComposedDate();
    }
  }

  updateComposedDate() {
    const d = this.birthDay();
    const m = this.birthMonth();
    const y = this.birthYear();
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const fullDate = `${y}-${m}-${d}`;
      this.patientForm.patchValue({ birthDate: fullDate });
      this.calculateAge(fullDate);
    }
  }

  calculateAge(dateString: string) {
    let age: number | string = '';
    if (dateString && this.patientForm.get('birthDate')?.valid) {
      age = Number(this.today.slice(0, 4)) - Number(dateString.slice(0, 4));
      if (this.today.slice(5) < dateString.slice(5)) age--;
    }
    this.patientForm.patchValue({ age });
  }

  get bmi(): string {
    const weight = Number(this.patientForm.get('vitals.weight')?.value),
      height = Number(this.patientForm.get('vitals.heightCm')?.value) / 100;
    return weight > 0 &&
      height > 0 &&
      !this.patientForm.get('vitals.weight')?.invalid &&
      !this.patientForm.get('vitals.heightCm')?.invalid
      ? (weight / (height * height)).toFixed(2)
      : '';
  }

  private buildClinicalCore() {
    const raw = this.patientForm.getRawValue(),
      core = emptyClinicalCore();
    const text = (value: any) => String(value ?? '').trim();
    const selected = (options: { key: string; label: string }[], values: any) =>
      options
        .filter((option) => values?.[option.key] === true)
        .map((option) => option.label)
        .join(', ');
    const join = (...values: any[]) => values.map(text).filter(Boolean).join('. ');
    core.familyHistory = join(
      selected(this.hereditaryOptions, raw.familyBackground),
      raw.familyBackgroundOther,
      raw.familyBackgroundDetails,
    );
    core.pathologicalHistory = join(
      selected(this.pathologicalOptions, raw.pathologicalBackground),
      raw.pathologicalBackgroundOther,
      raw.pathologicalBackground?.allergy ? raw.allergyDetails : '',
    );
    core.nonPathologicalHistory = join(
      selected(this.nonPathologicalOptions, raw.nonPathologicalBackground),
      raw.nonPathologicalBackgroundOther,
      ...[
        ['Vivienda', raw.housing],
        ['Higiene', raw.hygiene],
        ['Alimentación', raw.nutrition],
        ['Actividad física', raw.physicalActivity],
      ]
        .filter(([, value]) => text(value))
        .map(([label, value]) => label + ': ' + text(value)),
    );
    core.priorTreatments = text(raw.priorTreatments);
    core.vitals = Object.fromEntries(
      Object.entries(raw.vitals || {}).filter(
        ([, value]) => value !== null && value !== '' && value !== undefined,
      ),
    );
    if (this.bmi) core.vitals.bmi = Number(this.bmi);
    return core;
  }

  closeValidation() {
    this.validationDialog?.nativeElement.close?.();
  }
  private showValidation() {
    const dialog = this.validationDialog?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }
  showSaveError(message: string) {
    this.issues.set([]);
    this.saveError.set(message);
    this.showValidation();
  }
  goToIssue(issue: { key: string; tab: number }) {
    this.activeSubTab.set(issue.tab);
    this.closeValidation();
    setTimeout(
      () =>
        document
          .getElementById(
            issue.key.startsWith('vitals.')
              ? 'vital-' + issue.key.slice(7)
              : 'patient-' + issue.key,
          )
          ?.focus(),
      0,
    );
  }
  onSubmit() {
    if (!this.permissions.can('patients', 'write')) return;
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      this.saveError.set('');
      const personal = this.personalSections
        .flatMap((section) => section.fields)
        .filter((field) => this.patientForm.get(field.key)?.invalid)
        .map((field) => ({
          key: field.key,
          label: field.label,
          message: this.fieldError(field.key),
          tab: 1,
        }));
      const vitals = this.vitalFields
        .filter((field) => this.patientForm.get('vitals.' + field.key)?.invalid)
        .map((field) => ({
          key: 'vitals.' + field.key,
          label: field.label,
          message: `Usa un valor entre ${field.min} y ${field.max} ${field.unit}.`,
          tab: 5,
        }));
      this.issues.set([...personal, ...vitals]);
      this.showValidation();
      return;
    }
    this.closeValidation();
    const value = this.patientForm.getRawValue();
    for (const field of this.personalSections.flatMap((section) => section.fields)) {
      if (typeof value[field.key] === 'string') value[field.key] = value[field.key].trim();
    }
    this.savePatientData.emit({
      ...value,
      clinicalCore: this.permissions.can('records', 'write') ? this.buildClinicalCore() : undefined,
    });
  }
}
