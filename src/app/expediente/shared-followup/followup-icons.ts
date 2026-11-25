import {
  Activity,
  HeartPulse,
  Thermometer,
  Scale,
  Ruler,
  Droplets,
  Wind,
  CalendarDays,
  ClipboardList,
  Stethoscope,
  Pill,
  FileText,
  ShieldAlert,
  Eye,
  Brain,
  Bone,
  User,
  Clock,
} from 'lucide-angular';
// The field label is also used for schemas whose keys differ by specialty.
export function followupFieldIcon(field: any) {
  const label = String(field.label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const rules: [RegExp, any][] = [
    [/peso|imc/, Scale],
    [/talla|altura|perimetro|longitud|movilidad|arcos/, Ruler],
    [/temperatura/, Thermometer],
    [/cardiac|tension|presion|pulso/, HeartPulse],
    [/respira|oxigen/, Wind],
    [/sangr|glucosa|hemoglobina/, Droplets],
    [/fecha|menstruacion|menarca|proxima cita/, CalendarDays],
    [/duracion|tiempo|frecuencia|sueno/, Clock],
    [/medic|farmac|tratamiento|dosis/, Pill],
    [/alerg|riesgo|contraindic|complicacion/, ShieldAlert],
    [/visual|ocular|ojo|pupila/, Eye],
    [/animo|cogniti|ansiedad|neurolog|mental/, Brain],
    [/musculo|fuerza|ose|fractura|articul|dolor|estabilidad/, Bone],
    [/paciente|familiar|habitus/, User],
    [/motivo|sintoma|exploracion|hallazgo/, Stethoscope],
  ];
  return (
    rules.find(([pattern]) => pattern.test(label))?.[1] ||
    (field.type === 'number' ? Activity : field.type === 'textarea' ? FileText : ClipboardList)
  );
}
export const followupSpecialtyIcons: Record<string, any> = {
  TRAUM: Bone,
  FIS: Activity,
  OFTA: Eye,
  PSI: Brain,
  GEN: Stethoscope,
  NUT: Scale,
  PED: User,
  GINE: HeartPulse,
  DENT: ShieldAlert,
  DER: Stethoscope,
};
