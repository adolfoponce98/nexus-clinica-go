import { ClinicalSpecialDocumentComponent } from './clinical-special-document.component';
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalCatalogPickerComponent } from './clinical-catalog-picker.component';
export function emptyClinicalCore(): any {
  return {
    chiefComplaint: '',
    evolution: '',
    studies: '',
    diagnoses: [],
    procedures: [],
    prognosisLife: '',
    prognosisFunction: '',
    treatment: '',
    medications: [],
    vitals: {},
    systems: {},
    physicalExam: {},
    gynecology: {},
    demographicCodes: {},
    gynecologyApplicable: false,
    vitalsNotRequired: false,
  };
}
@Component({
  selector: 'app-clinical-core',
  standalone: true,
  imports: [
    ClinicalSpecialDocumentComponent,
    CommonModule,
    FormsModule,
    ClinicalCatalogPickerComponent,
  ],
  template: ` <section
    class="border rounded-2xl p-4 space-y-4"
    style="border-color:var(--border-color)"
  >
    <h3 class="font-bold">
      {{ initial ? 'Historia clínica inicial' : 'Nota de evolución · SOAP' }}
    </h3>
    <p class="text-xs">
      Puedes guardar un borrador incompleto. Para firmar se validan los apartados obligatorios.
      Indica explícitamente cuando un estudio o exploración no aplique; no se completan respuestas
      médicas automáticamente.
    </p>
    @if (!initialOnly) {
      <label class="block text-xs font-bold"
        >Tipo de documento<select
          [ngModel]="kind()"
          (ngModelChange)="data.documentKind = $event; emit()"
          [ngModelOptions]="{ standalone: true }"
          [disabled]="disabled"
          class="block w-full border rounded-xl p-3 mt-1"
          style="background:var(--bg-primary)"
        >
          <option value="initial-history">Historia clínica inicial</option>
          <option value="evolution">Nota de evolución</option>
          <option value="interconsultation">Interconsulta</option>
          <option value="referral">Referencia / traslado</option>
          <option value="consent">Consentimiento informado</option>
          <option value="voluntaryDischarge">Egreso voluntario</option>
          <option value="authorityNotice">Notificación al Ministerio Público</option>
        </select></label
      >
    }
    @if (kind() !== 'initial-history' && kind() !== 'evolution') {
      <app-clinical-special-document
        [kind]="kind()"
        [value]="data.specialDocument"
        (valueChange)="data.specialDocument = $event; emit()"
        [disabled]="disabled"
      />
    } @else {
      @for (field of common; track field.key) {
        <label class="block text-xs font-bold"
          >{{ field.label }} *<textarea
            [(ngModel)]="data[field.key]"
            (ngModelChange)="emit()"
            [disabled]="disabled"
            [ngModelOptions]="{ standalone: true }"
            rows="2"
            class="block w-full p-3 border rounded-xl mt-1 font-normal"
            style="background:var(--bg-primary);border-color:var(--border-color)"
          ></textarea>
        </label>
      }
      <details open class="space-y-3">
        <summary class="font-bold cursor-pointer">Objetivo · signos vitales</summary>
        @if (kind() === 'evolution') {
          <label class="flex gap-2 text-xs"
            ><input
              type="checkbox"
              [(ngModel)]="data.vitalsNotRequired"
              (ngModelChange)="emit()"
              [ngModelOptions]="{ standalone: true }"
              [disabled]="disabled"
            />No se consideran necesarios en esta evolución</label
          >
          @if (data.vitalsNotRequired) {
            <input
              [(ngModel)]="data.vitalsOmissionReason"
              (ngModelChange)="emit()"
              [ngModelOptions]="{ standalone: true }"
              placeholder="Justificación clínica obligatoria"
              class="p-3 border rounded-xl w-full"
              style="background:var(--bg-primary)"
            />
          }
        }
        @if (!data.vitalsNotRequired || kind() === 'initial-history') {
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            @for (field of vitalFields; track field.key) {
              <label class="text-xs"
                >{{ field.label }} *<input
                  type="number"
                  step="any"
                  [(ngModel)]="data.vitals[field.key]"
                  (ngModelChange)="emit()"
                  [ngModelOptions]="{ standalone: true }"
                  [disabled]="disabled"
                  class="block w-full p-3 border rounded-xl mt-1"
                  style="background:var(--bg-primary);border-color:var(--border-color)"
              /></label>
            }
            <p class="text-xs">
              IMC calculado: <strong>{{ bmi() || '—' }}</strong> kg/m²
            </p>
          </div>
        }
      </details>
      <div class="space-y-3">
        <h4 class="font-bold">Análisis · diagnósticos CIE-10 *</h4>
        <app-clinical-catalog-picker
          kind="CIE10"
          (selected)="data.diagnoses.push($event); emit()"
          [disabled]="disabled"
        />
        @for (d of data.diagnoses; track $index) {
          <p class="text-sm">
            {{ d.code }} · {{ d.description }}
            <button
              type="button"
              (click)="data.diagnoses.splice($index, 1); emit()"
              [disabled]="disabled"
              class="text-red-500 text-xs"
            >
              Quitar
            </button>
          </p>
        }
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        @for (
          field of [
            { key: 'prognosisLife', label: 'Pronóstico para la vida' },
            { key: 'prognosisFunction', label: 'Pronóstico para la función' },
          ];
          track field.key
        ) {
          <label class="text-xs"
            >{{ field.label }} *<select
              [(ngModel)]="data[field.key]"
              (ngModelChange)="emit()"
              [ngModelOptions]="{ standalone: true }"
              [disabled]="disabled"
              class="block p-3 border rounded-xl w-full mt-1"
              style="background:var(--bg-primary)"
            >
              <option value="">Selecciona</option>
              <option>Bueno</option>
              <option>Malo</option>
              <option>Reservado</option>
            </select></label
          >
        }
      </div>
      <label class="block text-xs font-bold"
        >Plan · tratamiento e indicaciones *<textarea
          [(ngModel)]="data.treatment"
          (ngModelChange)="emit()"
          [ngModelOptions]="{ standalone: true }"
          [disabled]="disabled"
          rows="3"
          class="block w-full p-3 border rounded-xl mt-1"
          style="background:var(--bg-primary)"
        ></textarea>
      </label>
      <details class="space-y-3">
        <summary class="font-bold cursor-pointer">
          Medicamentos y procedimientos (cuando se indiquen)
        </summary>
        <app-clinical-catalog-picker
          kind="CNIS"
          (selected)="addMedication($event)"
          [disabled]="disabled"
        />
        @for (m of data.medications; track $index) {
          <div class="border rounded-xl p-3 space-y-2">
            <p class="font-bold text-xs">{{ m.cnisCode }} · {{ m.genericName }}</p>
            <div class="grid sm:grid-cols-2 gap-2">
              @for (field of medicationFields; track field.key) {
                <label class="text-xs"
                  >{{ field.label }} *<input
                    [(ngModel)]="m[field.key]"
                    (ngModelChange)="emit()"
                    [ngModelOptions]="{ standalone: true }"
                    [disabled]="disabled"
                    class="block p-2 border rounded-lg w-full"
                    style="background:var(--bg-primary)"
                /></label>
              }
            </div>
            <button
              type="button"
              (click)="data.medications.splice($index, 1); emit()"
              [disabled]="disabled"
              class="text-red-500 text-xs"
            >
              Quitar medicamento
            </button>
          </div>
        }
        <app-clinical-catalog-picker
          kind="CIE9MC"
          (selected)="data.procedures.push($event); emit()"
          [disabled]="disabled"
        />
        @for (p of data.procedures; track $index) {
          <p class="text-xs">
            {{ p.code }} · {{ p.description }}
            <button
              type="button"
              (click)="data.procedures.splice($index, 1); emit()"
              [disabled]="disabled"
            >
              Quitar
            </button>
          </p>
        }
      </details>
      @if (kind() === 'initial-history') {
        <details class="space-y-3">
          <summary class="font-bold cursor-pointer">Identificación con catálogos DGIS</summary>
          @for (field of demographicFields; track field.key) {
            <label class="block text-xs"
              >{{ field.label }} *<app-clinical-catalog-picker
                [kind]="field.kind"
                (selected)="data.demographicCodes[field.key] = $event; emit()"
                [disabled]="disabled"
              />{{ data.demographicCodes[field.key]?.code }} ·
              {{ data.demographicCodes[field.key]?.description }}</label
            >
          }
        </details>
        <details open class="space-y-3">
          <summary class="font-bold cursor-pointer">Interrogatorio y exploración inicial</summary>
          @for (field of initialFields; track field.key) {
            <label class="block text-xs"
              >{{ field.label }} *<textarea
                [(ngModel)]="data[field.key]"
                (ngModelChange)="emit()"
                [ngModelOptions]="{ standalone: true }"
                [disabled]="disabled"
                rows="2"
                class="block w-full border rounded-xl p-3 mt-1"
                [class.border-red-500]="field.key === 'pathologicalHistory'"
                style="background:var(--bg-primary)"
              ></textarea>
            </label>
          }
          <div class="grid sm:grid-cols-2 gap-3">
            @for (field of systemFields; track field.key) {
              <label class="text-xs"
                >{{ field.label }} *<input
                  [(ngModel)]="data.systems[field.key]"
                  (ngModelChange)="emit()"
                  [ngModelOptions]="{ standalone: true }"
                  [disabled]="disabled"
                  class="block border rounded-xl p-3 w-full"
                  style="background:var(--bg-primary)"
              /></label>
            }
          </div>
          <h4 class="text-sm font-bold">Exploración por regiones</h4>
          <div class="grid sm:grid-cols-2 gap-3">
            @for (field of regionFields; track field.key) {
              <label class="text-xs"
                >{{ field.label }} *<input
                  [(ngModel)]="data.physicalExam[field.key]"
                  (ngModelChange)="emit()"
                  [ngModelOptions]="{ standalone: true }"
                  [disabled]="disabled"
                  class="block border rounded-xl p-3 w-full"
                  style="background:var(--bg-primary)"
              /></label>
            }
          </div>
          <label class="flex gap-2 text-xs"
            ><input
              type="checkbox"
              [(ngModel)]="data.gynecologyApplicable"
              (ngModelChange)="emit()"
              [ngModelOptions]="{ standalone: true }"
              [disabled]="disabled"
            />Aplican antecedentes ginecoobstétricos</label
          >
          @if (data.gynecologyApplicable) {
            <div class="grid sm:grid-cols-2 gap-3">
              @for (field of gynecologyFields; track field.key) {
                <label class="text-xs"
                  >{{ field.label }} *<input
                    [(ngModel)]="data.gynecology[field.key]"
                    (ngModelChange)="emit()"
                    [ngModelOptions]="{ standalone: true }"
                    [disabled]="disabled"
                    class="block w-full border rounded-xl p-3"
                    style="background:var(--bg-primary)"
                /></label>
              }
            </div>
          }
        </details>
      }
    }
  </section>`,
})
export class ClinicalCoreComponent implements OnChanges {
  @Input() value: any;
  @Input() initial = false;
  @Input() initialOnly = false;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<any>();
  data = emptyClinicalCore();
  common = [
    { key: 'chiefComplaint', label: 'Motivo de consulta' },
    { key: 'evolution', label: 'Subjetivo · padecimiento actual, inicio y evolución' },
    { key: 'studies', label: 'Resultados previos y actuales de estudios' },
  ];
  vitalFields = [
    { key: 'temperature', label: 'Temperatura °C' },
    { key: 'systolic', label: 'Tensión sistólica mmHg' },
    { key: 'diastolic', label: 'Tensión diastólica mmHg' },
    { key: 'heartRate', label: 'Frecuencia cardiaca lpm' },
    { key: 'respiratoryRate', label: 'Frecuencia respiratoria rpm' },
    { key: 'weight', label: 'Peso kg' },
    { key: 'heightCm', label: 'Talla cm' },
  ];
  initialFields = [
    { key: 'familyHistory', label: 'Antecedentes heredofamiliares' },
    { key: 'pathologicalHistory', label: 'Antecedentes personales patológicos y alergias' },
    {
      key: 'nonPathologicalHistory',
      label:
        'Vivienda, higiene, alimentación, actividad física, tabaco, alcohol, sustancias e inmunizaciones',
    },
    {
      key: 'priorTreatments',
      label: 'Tratamientos previos convencionales, alternativos y tradicionales',
    },
    { key: 'generalAppearance', label: 'Habitus exterior, conciencia y orientación' },
  ];
  systemFields = [
    { key: 'cardiovascular', label: 'Cardiovascular' },
    { key: 'respiratory', label: 'Respiratorio' },
    { key: 'digestive', label: 'Digestivo' },
    { key: 'urinary', label: 'Urinario' },
    { key: 'genital', label: 'Genital' },
    { key: 'endocrine', label: 'Endocrino' },
    { key: 'hematologic', label: 'Hemolinfático' },
    { key: 'musculoskeletal', label: 'Musculoesquelético' },
    { key: 'skin', label: 'Piel y anexos' },
    { key: 'neurologic', label: 'Sistema nervioso' },
  ];
  regionFields = [
    { key: 'head', label: 'Cabeza' },
    { key: 'neck', label: 'Cuello' },
    { key: 'thorax', label: 'Tórax' },
    { key: 'abdomen', label: 'Abdomen' },
    { key: 'limbs', label: 'Miembros' },
    { key: 'genitals', label: 'Genitales / justificación según especialidad' },
  ];
  demographicFields = [
    { key: 'sex', kind: 'SEX', label: 'Sexo estandarizado' },
    { key: 'state', kind: 'STATE', label: 'Entidad federativa' },
    { key: 'municipality', kind: 'MUNICIPALITY', label: 'Municipio' },
    { key: 'locality', kind: 'LOCALITY', label: 'Localidad' },
    { key: 'nationality', kind: 'NATIONALITY', label: 'Nacionalidad' },
    { key: 'language', kind: 'LANGUAGE', label: 'Lengua indígena / no aplica según catálogo' },
    { key: 'coverage', kind: 'COVERAGE', label: 'Derechohabiencia' },
    { key: 'occupation', kind: 'OCCUPATION', label: 'Ocupación estandarizada' },
  ];
  gynecologyFields = [
    { key: 'menarche', label: 'Menarca' },
    { key: 'menstrualPattern', label: 'Ritmo menstrual' },
    { key: 'lastMenstruation', label: 'Fecha de última menstruación' },
    { key: 'pregnancies', label: 'Gestas' },
    { key: 'deliveries', label: 'Partos' },
    { key: 'cesareans', label: 'Cesáreas' },
    { key: 'abortions', label: 'Abortos' },
    { key: 'contraception', label: 'Anticoncepción' },
  ];
  medicationFields = [
    { key: 'dose', label: 'Dosis' },
    { key: 'route', label: 'Vía de administración' },
    { key: 'frequency', label: 'Periodicidad' },
    { key: 'duration', label: 'Duración' },
  ];
  kind() {
    return this.initialOnly
      ? 'initial-history'
      : this.data.documentKind || (this.initial ? 'initial-history' : 'evolution');
  }
  ngOnChanges() {
    this.data = { ...emptyClinicalCore(), ...structuredClone(this.value || {}) };
  }
  emit() {
    this.valueChange.emit(structuredClone(this.data));
  }
  bmi() {
    const h = Number(this.data.vitals.heightCm) / 100,
      w = Number(this.data.vitals.weight);
    return h > 0 && w > 0 ? (w / (h * h)).toFixed(2) : '';
  }
  addMedication(value: any) {
    this.data.medications.push({
      cnisCode: value.code,
      genericName: value.description,
      dose: '',
      route: '',
      frequency: '',
      duration: '',
    });
    this.emit();
  }
}
