import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  FileText,
  User,
  Building2,
  Stethoscope,
  HeartPulse,
  ClipboardList,
  Paperclip,
  ShieldCheck,
  PenLine,
  CalendarDays,
} from 'lucide-angular';
import { SPECIALTY_SCHEMAS } from '../expediente/shared-followup/specialty-schemas';
import { followupFieldIcon } from '../expediente/shared-followup/followup-icons';
import { ClinicalReadValueComponent } from './clinical-read-value.component';
@Component({
  selector: 'app-clinical-document-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ClinicalReadValueComponent],
  templateUrl: './clinical-document-view.component.html',
  styleUrl: './clinical-document-view.component.css',
})
export class ClinicalDocumentViewComponent {
  @Input() note: any;
  @Input() integrityHash = '';
  readonly icons = {
    FileText,
    User,
    Building2,
    Stethoscope,
    HeartPulse,
    ClipboardList,
    Paperclip,
    ShieldCheck,
    PenLine,
    CalendarDays,
  };
  fieldIcon = followupFieldIcon;
  present(value: any): boolean {
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.some((v) => this.present(v));
    if (typeof value === 'object') return Object.values(value).some((v) => this.present(v));
    return true;
  }
  entries(obj: any) {
    return Object.entries(obj || {})
      .filter(([k, v]) => this.present(v))
      .map(([key, value]) => ({ key, value }));
  }
  get specialtySections() {
    const schema = SPECIALTY_SCHEMAS[this.note?.specialtyCode];
    if (!schema || this.note?.specialtySchemaVersion !== 1) return [];
    return [
      ...schema.groups,
      { title: 'Registros y herramientas de la especialidad', fields: schema.extraFields },
    ].filter((group: any) => group.fields.length);
  }
  get attachments() {
    return (
      this.note?.controlStudiesAndImages?.attachedImagesUrls || this.note?.attachedImagesUrls || []
    );
  }
  readonly groupedSections = [
    { key: 'systems', label: 'Interrogatorio por aparatos y sistemas' },
    { key: 'physicalExam', label: 'Exploración física por regiones' },
    { key: 'gynecology', label: 'Antecedentes ginecoobstétricos' },
    { key: 'specialDocument', label: 'Información complementaria del documento' },
  ];
  labels: any = {
    cardiovascular: 'Cardiovascular',
    respiratory: 'Respiratorio',
    digestive: 'Digestivo',
    urinary: 'Urinario',
    genital: 'Genital',
    endocrine: 'Endocrino',
    hematologic: 'Hemolinfático',
    musculoskeletal: 'Musculoesquelético',
    skin: 'Piel y anexos',
    neurologic: 'Neurológico',
    head: 'Cabeza',
    neck: 'Cuello',
    thorax: 'Tórax',
    abdomen: 'Abdomen',
    limbs: 'Miembros',
    genitals: 'Genitales',
    menarche: 'Menarca',
    menstrualPattern: 'Ritmo menstrual',
    lastMenstruation: 'Última menstruación',
    pregnancies: 'Gestas',
    deliveries: 'Partos',
    cesareans: 'Cesáreas',
    abortions: 'Abortos',
    contraception: 'Anticoncepción',
  };
  textFields = [
    { key: 'chiefComplaint', label: 'Motivo de consulta' },
    { key: 'evolution', label: 'Evolución y actualización del cuadro clínico' },
    { key: 'familyHistory', label: 'Antecedentes heredofamiliares' },
    { key: 'pathologicalHistory', label: 'Antecedentes personales patológicos y alergias' },
    { key: 'nonPathologicalHistory', label: 'Antecedentes no patológicos' },
    { key: 'priorTreatments', label: 'Tratamientos previos' },
    { key: 'generalAppearance', label: 'Habitus exterior' },
    { key: 'studies', label: 'Resultados de estudios' },
    { key: 'treatment', label: 'Tratamiento e indicaciones' },
  ];
  vitalFields = [
    { key: 'temperature', label: 'Temperatura °C' },
    { key: 'systolic', label: 'Sistólica mmHg' },
    { key: 'diastolic', label: 'Diastólica mmHg' },
    { key: 'heartRate', label: 'FC lpm' },
    { key: 'respiratoryRate', label: 'FR rpm' },
    { key: 'weight', label: 'Peso kg' },
    { key: 'heightCm', label: 'Talla cm' },
    { key: 'bmi', label: 'IMC kg/m²' },
    { key: 'oxygenSaturation', label: 'Saturación de oxígeno %' },
  ];
  readonly specialLabels: Record<string, string> = {
    reason: 'Motivo',
    presumptiveDiagnosis: 'Diagnóstico presuntivo',
    diagnosticCriteria: 'Criterios diagnósticos',
    studyPlan: 'Plan de estudios',
    suggestedTreatment: 'Tratamiento sugerido',
    receivingEstablishment: 'Establecimiento receptor',
    clinicalSummary: 'Resumen clínico',
    diagnosticImpression: 'Impresión diagnóstica',
    previousTreatment: 'Tratamiento previo',
    title: 'Título',
    place: 'Lugar',
    authorizedAct: 'Acto autorizado',
    risks: 'Riesgos',
    benefits: 'Beneficios',
    contingencyAuthorization: 'Autorización para contingencias',
    patientOrRepresentative: 'Paciente o representante',
    relationship: 'Parentesco o representación',
    witnessOne: 'Primer testigo',
    witnessTwo: 'Segundo testigo',
    patientSignature: 'Firma del paciente',
    witnessOneSignature: 'Firma del primer testigo',
    witnessTwoSignature: 'Firma del segundo testigo',
    requestedBy: 'Solicitante',
    risksExplained: 'Riesgos explicados',
    receivingAuthority: 'Autoridad receptora',
    placeOfEvents: 'Lugar de los hechos',
    reportedBy: 'Informante',
  };
  label(key: string) {
    return this.labels[key] || this.specialLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
