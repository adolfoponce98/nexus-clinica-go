import { OfficeCardDetailsComponent } from './office-card-details.component';
import { DirectorySkeletonComponent } from '../shared/directory-skeleton.component';
import { CreationAccessService } from '../planes/creation-access.service';
import { Component, inject, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  LucideAngularModule,
  Building2,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Eye,
  Edit3,
  MapPin,
  Users,
  Save,
  Loader2,
  KeyRound,
  Phone,
  Globe,
  FileText,
  Accessibility,
  ShieldCheck,
  TriangleAlert,
  X,
  Clock,
  ChevronRight,
} from 'lucide-angular';
import { PlanUsageComponent } from '../planes/plan-usage.component';
import { BillingService } from '../planes/billing.service';
import { PermissionDirective } from '../auth/permission.directive';
import { PermissionService } from '../auth/permission.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { AuthService } from '../auth/auth.service';
import { OfficeSyncService } from '../auth/office-sync.service';
import { API_URLS } from '../config/api-urls';
import { OfficeHoursEditorComponent } from '../scheduling/office-hours-editor.component';
import { normalizeOfficeHours } from '../scheduling/office-hours';
@Component({
  selector: 'app-clinics-tab',
  standalone: true,
  imports: [
    OfficeCardDetailsComponent,
    DirectorySkeletonComponent,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PlanUsageComponent,
    PermissionDirective,
    OfficeHoursEditorComponent,
  ],
  templateUrl: './clinics-tab.component.html',
  styleUrl: './clinics-tab.component.css',
})
export class ClinicsComponent implements OnInit, OnDestroy {
  readonly billing = inject(BillingService);
  private readonly creationAccess = inject(CreationAccessService);
  readonly permissions = inject(PermissionService);
  private readonly api = inject(ClinicApiService);
  private readonly auth = inject(AuthService);
  private readonly sync = inject(OfficeSyncService);
  private readonly subscriptions = new Subscription();
  readonly icons = {
    Building2,
    Plus,
    Trash2,
    Search,
    ArrowLeft,
    Eye,
    Edit3,
    MapPin,
    Users,
    Save,
    Loader2,
    KeyRound,
    Phone,
    Globe,
    FileText,
    Accessibility,
    ShieldCheck,
    TriangleAlert,
    X,
    Clock,
    ChevronRight,
  };
  @ViewChild('disableDialog') private disableDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('feedbackDialog') private feedbackDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild(OfficeHoursEditorComponent) private hoursEditor?: OfficeHoursEditorComponent;
  consultorios = signal<any[]>([]);
  selectedConsultorio = signal<any | null>(null);
  isLoading = signal(true);
  busy = signal(false);
  loadError = signal('');
  operationError = signal('');
  feedback = signal('');
  disableTarget = signal<any | null>(null);
  searchQuery = '';
  isEditingMode = false;
  readonly fields = [
    {
      key: 'name',
      label: 'Nombre del consultorio',
      icon: Building2,
      placeholder: 'Ej. Clínica Médica Sur',
      required: true,
    },
    {
      key: 'establishmentType',
      label: 'Tipo de establecimiento',
      icon: Building2,
      placeholder: 'Consultorio de especialidad',
    },
    { key: 'clues', label: 'CLUES del establecimiento', icon: FileText, placeholder: 'Si aplica' },
    { key: 'address', label: 'Dirección', icon: MapPin, placeholder: 'Calle y número' },
    { key: 'city', label: 'Ciudad / municipio', icon: MapPin, placeholder: 'Ej. Zapopan, Jalisco' },
    { key: 'postalCode', label: 'Código postal', icon: MapPin, placeholder: 'Ej. 45030' },
    {
      key: 'additionalInfo',
      label: 'Piso, torre o número interior',
      icon: Building2,
      placeholder: 'Información adicional',
    },
    {
      key: 'phoneMain',
      label: 'Teléfono principal',
      icon: Phone,
      placeholder: 'Teléfono de contacto',
    },
    { key: 'phoneSecondary', label: 'Teléfono secundario', icon: Phone, placeholder: 'Opcional' },
    { key: 'website', label: 'Sitio web', icon: Globe, placeholder: 'https://' },
  ];
  readonly accessibilityOptions = [
    { key: 'wheelchair', label: 'Silla de ruedas o muletas' },
    { key: 'pregnantOrKids', label: 'Personas embarazadas o con niños' },
    { key: 'visualDisability', label: 'Discapacidad visual' },
    { key: 'hearingDisability', label: 'Discapacidad auditiva' },
  ];
  get canEdit() {
    return this.isEditingMode && this.permissions.can('consultorios', 'write');
  }
  filteredConsultorios() {
    const q = this.searchQuery.trim().toLocaleLowerCase();
    return this.consultorios().filter((c) =>
      (c.name + ' ' + (c.city || '')).toLocaleLowerCase().includes(q),
    );
  }
  ngOnInit() {
    this.subscriptions.add(
      this.sync.updates.subscribe((type) => {
        if (type === 'offices') void this.cargarConsultorios();
      }),
    );
    void this.cargarConsultorios();
  }
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.disableDialog?.nativeElement.close();
    this.feedbackDialog?.nativeElement.close();
  }
  async cargarConsultorios() {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const data = await this.api.post(API_URLS.GETDOCTORSOFFICE, {});
      if (!Array.isArray(data.consultorios))
        throw new Error('No se pudieron consultar los consultorios.');
      const rows = data.consultorios.filter(
        (office: any) => office.active !== false && office.status !== 'disabled',
      );
      this.consultorios.set(
        rows.map((c: any) => ({
          ...c,
          id: c.idConsultorio || c.id,
          accessibility: { ...c.accessibility },
        })),
      );
      this.auth.saveAllBranches(rows);
    } catch (e: any) {
      this.loadError.set(e.message);
    } finally {
      this.isLoading.set(false);
    }
  }
  addConsultorio() {
    if (!this.permissions.can('consultorios', 'write') || !this.creationAccess.allow('offices'))
      return;
    this.selectedConsultorio.set({
      id: '',
      name: '',
      establishmentType: 'Consultorio de especialidad',
      accessibility: {
        wheelchair: false,
        pregnantOrKids: false,
        visualDisability: false,
        hearingDisability: false,
      },
      paymentMethods: { cash: true },
      patientTypes: { adults: true },
    });
    this.isEditingMode = true;
  }
  verDetalle(c: any, _index?: number) {
    this.selectedConsultorio.set(structuredClone(c));
    this.isEditingMode = false;
  }
  editarConsultorio(c: any, _index?: number) {
    this.selectedConsultorio.set(structuredClone(c));
    this.isEditingMode = true;
  }
  regresarAListado() {
    if (!this.busy()) this.selectedConsultorio.set(null);
  }
  private showFeedback(message: string) {
    this.feedback.set(message);
    this.feedbackDialog?.nativeElement.showModal();
  }
  closeFeedback() {
    this.feedbackDialog?.nativeElement.close();
  }
  async guardarConsultorioIndividual() {
    if (this.busy() || !this.canEdit) return;
    const office = this.selectedConsultorio();
    if (!office?.name?.trim()) {
      this.showFeedback('El nombre del consultorio es obligatorio.');
      return;
    }
    if (this.hoursEditor?.error) {
      this.showFeedback(this.hoursEditor.error);
      return;
    }
    this.busy.set(true);
    try {
      const payload = {
        ...Object.fromEntries(this.fields.map((f) => [f.key, String(office[f.key] || '').trim()])),
        idConsultorio: office.idConsultorio || office.id || null,
        officeHours: normalizeOfficeHours(office.officeHours),
        accessibility: office.accessibility || {},
        directions: office.directions || '',
        paymentMethods: office.paymentMethods || {},
        insurancePolicy: office.insurancePolicy || 'privateOnly',
        patientTypes: office.patientTypes || {},
      };
      await this.api.post(API_URLS.SAVEORUPDATECONSULTORIO, payload);
      this.selectedConsultorio.set(null);
      await this.cargarConsultorios();
      await this.billing.refresh();
      this.showFeedback('Consultorio guardado correctamente.');
    } catch (e: any) {
      this.showFeedback(e.message || 'No se pudo guardar el consultorio.');
    } finally {
      this.busy.set(false);
    }
  }
  eliminarConsultorio(id: string | number) {
    if (this.busy() || !this.permissions.can('consultorios', 'delete')) return;
    const office = this.consultorios().find((c) => (c.idConsultorio || c.id) === id);
    if (!office) return;
    this.disableTarget.set(office);
    this.operationError.set('');
    this.disableDialog?.nativeElement.showModal();
  }
  closeDisable() {
    if (!this.busy()) {
      this.disableDialog?.nativeElement.close();
      this.disableTarget.set(null);
    }
  }
  async confirmDisable() {
    const office = this.disableTarget();
    if (!office || this.busy()) return;
    this.busy.set(true);
    this.operationError.set('');
    try {
      await this.api.post(API_URLS.DEACTIVATE_OFFICE, {
        idConsultorio: office.idConsultorio || office.id,
      });
      this.consultorios.update((rows) =>
        rows.filter((c) => (c.idConsultorio || c.id) !== (office.idConsultorio || office.id)),
      );
      this.auth.saveAllBranches(this.consultorios());
      this.disableDialog?.nativeElement.close();
      this.disableTarget.set(null);
      await this.cargarConsultorios();
      await this.billing.refresh();
    } catch (e: any) {
      this.operationError.set(e.message || 'No se pudo deshabilitar el consultorio.');
    } finally {
      this.busy.set(false);
    }
  }
}
