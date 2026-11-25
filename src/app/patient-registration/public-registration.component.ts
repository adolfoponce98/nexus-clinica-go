import {
  PRIVACY_NOTICE_PATH,
  PRIVACY_NOTICE_VERSION,
} from '../privacy-notice/privacy-notice.content';
import {
  LucideAngularModule,
  User,
  Users,
  CalendarDays,
  Heart,
  IdCard,
  Smartphone,
  Phone,
  Mail,
  GraduationCap,
  Church,
  Briefcase,
  FileText,
  MapPin,
  Map,
  Globe,
  House,
  Building2,
  Activity,
  ShieldCheck,
  PenLine,
  Send,
  Clock,
  Droplet,
  Wind,
  Brain,
  Syringe,
  Pill,
  Cigarette,
  Wine,
  Utensils,
  Droplets,
  Scissors,
  TriangleAlert,
  Dna,
  Bone,
  Ribbon,
  Stethoscope,
} from 'lucide-angular';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { SignaturePadComponent } from '../clinical/signature-pad.component';
import { PublicRegistrationApiService } from './public-registration-api.service';
import { API_URLS } from '../config/api-urls';
import {
  PERSONAL_FIELDS,
  ADDRESS_FIELDS,
  HEREDITARY_OPTIONS,
  PATHOLOGICAL_OPTIONS,
  NON_PATHOLOGICAL_OPTIONS,
} from './intake-fields';
@Component({
  selector: 'app-public-patient-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SignaturePadComponent, LucideAngularModule],
  templateUrl: './public-registration.component.html',
  styleUrl: './public-registration.component.css',
})
export class PublicRegistrationComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private api = inject(PublicRegistrationApiService);
  private meta = inject(Meta);
  private title = inject(Title);
  private previousTitle = this.title.getTitle();
  private timer?: ReturnType<typeof setInterval>;
  private offset = 0;
  private destroyed = false;
  readonly privacyNoticePath = PRIVACY_NOTICE_PATH;
  readonly privacyNoticeVersion = PRIVACY_NOTICE_VERSION;
  info = signal<any>(null);
  doctorLogoFailed = signal(false);
  state = signal<'loading' | 'ready' | 'expired' | 'used' | 'invalid' | 'success'>('loading');
  error = signal('');
  sending = signal(false);
  remaining = signal(3600);
  signature = signal('');
  signatureDraft = '';
  signing = signal(false);
  token = '';
  readonly icons = { User, Users, MapPin, Building2, ShieldCheck, PenLine, Send, Clock };
  private readonly fieldIcons: Record<string, typeof User> = {
    firstName: User,
    paternalSurname: User,
    maternalSurname: User,
    birthDate: CalendarDays,
    gender: Users,
    curp: IdCard,
    cellphone: Smartphone,
    homePhone: Phone,
    email: Mail,
    maritalStatus: Heart,
    educationLevel: GraduationCap,
    religion: Church,
    occupation: Briefcase,
    additionalNote: FileText,
    streetAndNumber: MapPin,
    neighborhood: House,
    municipality: Building2,
    state: Map,
    country: Globe,
    familyBackground: Dna,
    pathologicalBackground: Stethoscope,
    nonPathologicalBackground: Activity,
    familyBackgroundOther: Users,
    familyBackgroundDetails: Users,
    pathologicalBackgroundOther: FileText,
    allergyDetails: TriangleAlert,
    priorTreatments: Pill,
    nonPathologicalBackgroundOther: FileText,
    housing: House,
    hygiene: Droplets,
    nutrition: Utensils,
    physicalActivity: Activity,
    diabetes: Droplet,
    asthma: Wind,
    hypertension: Activity,
    cancer: Ribbon,
    heartDisease: Heart,
    mentalIllness: Brain,
    allergies: TriangleAlert,
    allergy: TriangleAlert,
    endocrine: Activity,
    liverDisease: Stethoscope,
    surgery: Scissors,
    hospitalization: Building2,
    trauma: Bone,
    transfusion: Droplet,
    smoking: Cigarette,
    alcoholism: Wine,
    toxicomania: Pill,
    immunizations: Syringe,
    ivsa: Heart,
  };
  fieldIcon(key: string) {
    return this.fieldIcons[key] || FileText;
  }
  personalFields = PERSONAL_FIELDS;
  addressFields = ADDRESS_FIELDS;
  groups = [
    {
      key: 'familyBackground',
      title: 'Antecedentes heredofamiliares',
      description: 'Antecedentes de enfermedades en tu familia.',
      options: HEREDITARY_OPTIONS,
      other: 'familyBackgroundOther',
      otherLabel: 'Otras enfermedades familiares',
    },
    {
      key: 'pathologicalBackground',
      title: 'Antecedentes patológicos',
      description: 'Enfermedades, alergias, cirugías o condiciones que has presentado.',
      options: PATHOLOGICAL_OPTIONS,
      other: 'pathologicalBackgroundOther',
      otherLabel: 'Otros antecedentes patológicos',
    },
    {
      key: 'nonPathologicalBackground',
      title: 'Antecedentes no patológicos',
      description: 'Hábitos y aspectos de tu estilo de vida.',
      options: NON_PATHOLOGICAL_OPTIONS.map((o) =>
        o.key === 'ivsa' ? { ...o, label: 'Inicio de vida sexual activa' } : o,
      ),
      other: 'nonPathologicalBackgroundOther',
      otherLabel: 'Otros hábitos o antecedentes',
    },
  ];
  form: FormGroup = this.fb.group({
    ...Object.fromEntries(
      [...PERSONAL_FIELDS, ...ADDRESS_FIELDS].map((f) => [
        f.key,
        [
          '',
          [
            ...(f.required ? [Validators.required] : []),
            Validators.maxLength(f.maxLength || 2000),
            ...(f.type === 'email' ? [Validators.email] : []),
            ...(f.pattern ? [Validators.pattern(f.pattern)] : []),
          ],
        ],
      ]),
    ),
    ...Object.fromEntries(
      this.groups.map((g) => [
        g.key,
        this.fb.group(Object.fromEntries(g.options.map((o) => [o.key, false]))),
      ]),
    ),
    familyBackgroundOther: [''],
    familyBackgroundDetails: [''],
    pathologicalBackgroundOther: [''],
    allergyDetails: [''],
    priorTreatments: [''],
    nonPathologicalBackgroundOther: [''],
    housing: [''],
    hygiene: [''],
    nutrition: [''],
    physicalActivity: [''],
    privacyAccepted: [false, Validators.requiredTrue],
    secondaryPurposesDeclined: [false],
  });
  get today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(this.info()?.serverNow || Date.now()));
  }
  get age() {
    const date = String(this.form.get('birthDate')?.value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > this.today) return '';
    let age = Number(this.today.slice(0, 4)) - Number(date.slice(0, 4));
    if (this.today.slice(5) < date.slice(5)) age--;
    return age >= 0 ? age : '';
  }
  get canSubmit() {
    const required = [...PERSONAL_FIELDS, ...ADDRESS_FIELDS]
      .filter((f) => f.required)
      .every((f) => String(this.form.get(f.key)?.value || '').trim());
    return (
      this.state() === 'ready' &&
      this.remaining() > 0 &&
      this.form.valid &&
      required &&
      this.age !== '' &&
      Number(this.age) <= 130 &&
      !!this.signature() &&
      !this.sending()
    );
  }
  get clock() {
    return Math.floor(this.remaining() / 60) + ':' + String(this.remaining() % 60).padStart(2, '0');
  }
  async ngOnInit() {
    this.meta.updateTag({ name: 'robots', content: 'noindex,nofollow,noarchive' });
    this.meta.updateTag({ name: 'referrer', content: 'no-referrer' });
    this.token = this.route.snapshot.paramMap.get('token') || '';
    try {
      const info = await this.api.post(API_URLS.GET_PATIENT_REGISTRATION_LINK, {
        token: this.token,
      });
      if (this.destroyed) return;
      this.info.set(info);
      this.offset = Date.parse(info.serverNow) - Date.now();
      this.state.set('ready');
      this.title.setTitle('Registro de paciente · ' + info.doctorName);
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
    } catch (e: any) {
      if (!this.destroyed) this.fail(e);
    }
  }
  private tick() {
    if (this.state() !== 'ready') return;
    const remaining = Math.min(
      3600,
      Math.max(
        0,
        Math.ceil((Date.parse(this.info()?.expiresAt) - Date.now() - this.offset) / 1000),
      ),
    );
    this.remaining.set(remaining);
    if (!remaining && !this.sending()) this.state.set('expired');
  }
  private fail(e: any) {
    this.error.set(e.message || 'No se pudo completar la solicitud.');
    if (e.code === 'LINK_EXPIRED') this.state.set('expired');
    else if (e.code === 'LINK_USED') this.state.set('used');
    else if (e.code === 'INVALID_LINK' || e.code === 'LINK_UNAVAILABLE') this.state.set('invalid');
    else if (this.state() === 'loading') this.state.set('invalid');
  }
  openSignature() {
    this.signatureDraft = this.signature();
    this.signing.set(true);
  }
  acceptSignature() {
    if (!this.signatureDraft) return;
    this.signature.set(this.signatureDraft);
    this.signing.set(false);
  }
  async submit() {
    if (!this.canSubmit) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.error.set('');
    this.form.disable({ emitEvent: false });
    try {
      const raw: any = this.form.getRawValue(),
        { privacyAccepted, secondaryPurposesDeclined, ...form } = raw;
      await this.api.post(API_URLS.SUBMIT_PATIENT_REGISTRATION, {
        token: this.token,
        form,
        privacyAccepted,
        privacyNoticeVersion: this.privacyNoticeVersion,
        secondaryPurposesDeclined,
        signatureImage: this.signature(),
      });
      if (this.destroyed) return;
      this.state.set('success');
      this.form.reset();
      this.signature.set('');
      this.signatureDraft = '';
      if (this.timer) clearInterval(this.timer);
    } catch (e: any) {
      if (!this.destroyed) this.fail(e);
    } finally {
      this.form.enable({ emitEvent: false });
      this.sending.set(false);
      this.tick();
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    if (this.timer) clearInterval(this.timer);
    this.form.reset();
    this.signature.set('');
    this.signatureDraft = '';
    this.token = '';
    this.title.setTitle(this.previousTitle);
    this.meta.removeTag("name='robots'");
    this.meta.removeTag("name='referrer'");
  }
}
