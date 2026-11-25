import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../auth/permission.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { ClinicalIdentityComponent } from './clinical-identity.component';
import { ClinicalDocumentViewComponent } from './clinical-document-view.component';
@Component({
  selector: 'app-patient-intake',
  standalone: true,
  imports: [FormsModule, ClinicalIdentityComponent, ClinicalDocumentViewComponent],
  template: ` @if (permissions.can('patients', 'write') || permissions.can('nursing')) {
    <details class="border rounded-2xl p-4" style="border-color:var(--border-color)">
      <summary class="font-bold cursor-pointer">
        Datos demográficos y atención de enfermería
      </summary>
      <div class="space-y-4 pt-4">
        <label class="text-xs"
          >Paciente<select
            [(ngModel)]="selectedId"
            (ngModelChange)="load()"
            class="block w-full border rounded-xl p-3"
            style="background:var(--bg-primary)"
          >
            <option value="">Selecciona un paciente</option>
            @for (p of patients; track p.idPaciente || p.id) {
              <option [value]="p.idPaciente || p.id">
                {{ p.nombre || p.fichaDeIdentificacion?.nombreCompleto }}
              </option>
            }
          </select></label
        >
        @if (error()) {
          <p role="alert" class="text-red-500 text-sm">{{ error() }}</p>
        }
        @if (notice()) {
          <p class="text-emerald-500 text-sm">{{ notice() }}</p>
        }
        @if (selectedId) {
          <div class="grid sm:grid-cols-2 gap-3">
            @for (f of demographicFields; track f.key) {
              <label class="text-xs"
                >{{ f.label
                }}<input
                  [(ngModel)]="demographics[f.key]"
                  [disabled]="busy() || !permissions.can('patients', 'write')"
                  class="block w-full border rounded-xl p-3"
                  style="background:var(--bg-primary)"
              /></label>
            }
          </div>
          @if (permissions.can('patients', 'write')) {
            <button
              type="button"
              (click)="saveDemographics()"
              [disabled]="busy()"
              class="border rounded-xl px-4 py-3"
            >
              Guardar datos demográficos
            </button>
          }
          @if (permissions.can('nursing')) {
            <details>
              <summary class="text-blue-500 cursor-pointer">
                Identidad y firma del profesional
              </summary>
              <app-clinical-identity />
            </details>
            <h3 class="font-bold">Hoja de enfermería · signos vitales</h3>
            <div class="grid sm:grid-cols-3 gap-3">
              @for (f of vitalFields; track f.key) {
                <label class="text-xs"
                  >{{ f.label
                  }}<input
                    type="number"
                    step="any"
                    [(ngModel)]="vitals[f.key]"
                    [disabled]="busy()"
                    class="block w-full border rounded-xl p-3"
                    style="background:var(--bg-primary)"
                /></label>
              }
            </div>
            <textarea
              [(ngModel)]="observations"
              [disabled]="busy()"
              placeholder="Observaciones de enfermería"
              class="block w-full border rounded-xl p-3"
              style="background:var(--bg-primary)"
            ></textarea
            ><label class="flex gap-2 text-xs"
              ><input type="checkbox" [(ngModel)]="acknowledged" />Revisé los signos vitales y
              confirmo su firma con mi identidad profesional</label
            ><button
              type="button"
              (click)="saveVitals()"
              [disabled]="busy() || !acknowledged"
              class="rounded-xl bg-blue-600 text-white px-4 py-3 disabled:opacity-40"
            >
              Guardar y firmar hoja de enfermería
            </button>
            <h3 class="font-bold">Registros de enfermería</h3>
            @for (n of records(); track n.followUpId) {
              <app-clinical-document-view [note]="n" />
            }
          }
        }
      </div>
    </details>
  }`,
})
export class PatientIntakeComponent {
  @Input() patients: any[] = [];
  readonly permissions = inject(PermissionService);
  private api = inject(ClinicApiService);
  selectedId = '';
  demographics: any = {};
  vitals: any = {};
  observations = '';
  acknowledged = false;
  records = signal<any[]>([]);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  private requestId = crypto.randomUUID();
  demographicFields = [
    { key: 'nombreCompleto', label: 'Nombre completo' },
    { key: 'sexo', label: 'Sexo' },
    { key: 'fechaNacimiento', label: 'Fecha de nacimiento (AAAA-MM-DD)' },
    { key: 'edad', label: 'Edad' },
    { key: 'domicilio', label: 'Domicilio completo' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
    { key: 'contactoEmergencia', label: 'Contacto de emergencia' },
    { key: 'ocupacion', label: 'Ocupación' },
  ];
  vitalFields = [
    { key: 'temperature', label: 'Temperatura °C' },
    { key: 'systolic', label: 'Sistólica mmHg' },
    { key: 'diastolic', label: 'Diastólica mmHg' },
    { key: 'heartRate', label: 'FC lpm' },
    { key: 'respiratoryRate', label: 'FR rpm' },
    { key: 'weight', label: 'Peso kg' },
    { key: 'heightCm', label: 'Talla cm' },
  ];
  private payload() {
    return { idConsultorio: this.api.branchId(), idPaciente: this.selectedId };
  }
  async load() {
    if (!this.selectedId) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      this.demographics = (
        await this.api.post(API_URLS.GET_PATIENT_DEMOGRAPHICS, this.payload())
      ).fichaDeIdentificacion;
      if (this.permissions.can('nursing'))
        this.records.set(
          (await this.api.post(API_URLS.GET_NURSING_RECORDS, this.payload())).records,
        );
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async saveDemographics() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post(API_URLS.UPDATE_PATIENT_DEMOGRAPHICS, {
        ...this.payload(),
        fichaDeIdentificacion: this.demographics,
      });
      this.notice.set(
        'Datos demográficos actualizados. Las notas firmadas conservan su identificación original.',
      );
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async saveVitals() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post(API_URLS.RECORD_NURSING_VITALS, {
        ...this.payload(),
        vitals: this.vitals,
        observations: this.observations,
        signatureAcknowledged: this.acknowledged,
        requestId: this.requestId,
      });
      this.requestId = crypto.randomUUID();
      this.acknowledged = false;
      this.notice.set('Hoja de enfermería firmada y cerrada.');
      this.records.set((await this.api.post(API_URLS.GET_NURSING_RECORDS, this.payload())).records);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
}
