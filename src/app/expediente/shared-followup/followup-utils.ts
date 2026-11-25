import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from '../../config/security.config';
import { SPECIALTY_SCHEMAS } from './specialty-schemas';
export function normalizeSpecialty(value: any): string {
  const code = String(typeof value === 'object' ? value?.code : value || 'GEN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  if (SPECIALTY_SCHEMAS[code]) return code;
  const map: Record<string, string> = {
    GENERAL: 'GEN',
    'MEDICINA GENERAL': 'GEN',
    GINECOLOGIA: 'GINE',
    'GINECOLOGIA Y OBSTETRICIA': 'GINE',
    PEDIATRIA: 'PED',
    TRAUMATOLOGIA: 'TRAUM',
    ORTOPEDIA: 'TRAUM',
    'TRAUMATOLOGIA Y ORTOPEDIA': 'TRAUM',
    DERMATOLOGIA: 'DER',
    ODONTOLOGIA: 'DENT',
    DENTISTA: 'DENT',
    NUTRICION: 'NUT',
    NUTRIOLOGIA: 'NUT',
    PSICOLOGIA: 'PSI',
    FISIOTERAPIA: 'FIS',
    'TERAPIA FISICA': 'FIS',
    'TERAPIA FISICA Y REHABILITACION': 'FIS',
    OFTALMOLOGIA: 'OFTA',
    OFTAMOLOGIA: 'OFTA',
  };
  return map[code] || 'GEN';
}
export function decodeContextId(value: string): string {
  if (!value) return '';
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {}
  for (const text of [
    decoded,
    (() => {
      try {
        return atob(decoded);
      } catch {
        return '';
      }
    })(),
  ]) {
    if (!text) continue;
    try {
      const id = CryptoJS.AES.decrypt(text, SECURITY_CONFIG.ENCRYPTION_KEY).toString(
        CryptoJS.enc.Utf8,
      );
      if (id) return id;
    } catch {}
  }
  return decoded;
}
export const encodeContextId = (value: string) =>
  btoa(CryptoJS.AES.encrypt(value, SECURITY_CONFIG.ENCRYPTION_KEY).toString());
export function emptySpecialty(code: string): any {
  const schema = SPECIALTY_SCHEMAS[normalizeSpecialty(code)],
    result: any = {};
  for (const field of [...schema.groups.flatMap((g: any) => g.fields), ...schema.extraFields])
    result[field.key] =
      field.type === 'table'
        ? []
        : field.type === 'scores'
          ? Array(field.count).fill(null)
          : field.type === 'checkbox'
            ? null
            : field.type === 'number'
              ? null
              : '';
  return result;
}
export const bmi = (weight: any, height: any) =>
  Number(weight) > 0 && Number(height) > 0
    ? Math.round((Number(weight) / (Number(height) / 100) ** 2) * 100) / 100
    : null;
export function clinicalDate(at = new Date()): string {
  if (!Number.isFinite(at.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return value('year') + '-' + value('month') + '-' + value('day');
}
export function ageYears(birth: string, at = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth || '')) return null;
  const d = new Date(birth + 'T12:00:00Z');
  at = new Date(clinicalDate(at) + 'T12:00:00Z');
  if (
    !Number.isFinite(at.getTime()) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== birth ||
    d > at
  )
    return null;
  let years = at.getUTCFullYear() - d.getUTCFullYear();
  if (
    at.getUTCMonth() < d.getUTCMonth() ||
    (at.getUTCMonth() === d.getUTCMonth() && at.getUTCDate() < d.getUTCDate())
  )
    years--;
  return years;
}
export function gestation(last: string, at = new Date()) {
  const date = new Date(last + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(last || '') || !Number.isFinite(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== last) return null;
  const days = Math.floor(
    (new Date(clinicalDate(at) + 'T12:00:00Z').getTime() - date.getTime()) / 86400000,
  );
  if (!Number.isFinite(days) || days < 0 || days > 315) return null;
  const due = new Date(date.getTime() + 280 * 86400000);
  return { weeks: Math.floor(days / 7), days: days % 7, dueDate: due.toISOString().slice(0, 10) };
}
export function energyRequirements(data: any, vitals: any, age: number | null) {
  const w = Number(vitals?.weight),
    h = Number(vitals?.heightCm),
    sex = data.equationSex;
  if (
    !(
      w > 0 &&
      h > 0 &&
      age !== null &&
      age >= 18 &&
      age <= 120 &&
      ['Masculino', 'Femenino'].includes(sex)
    )
  )
    return null;
  let basal: number;
  if (data.energyEquation === 'Mifflin-St Jeor')
    basal = 10 * w + 6.25 * h - 5 * age + (sex === 'Masculino' ? 5 : -161);
  else if (data.energyEquation === 'Harris-Benedict (revisada 1984)')
    basal =
      sex === 'Masculino'
        ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age
        : 447.593 + 9.247 * w + 3.098 * h - 4.33 * age;
  else return null;
  return {
    basal: Math.round(basal),
    estimated: data.activityFactor > 0 ? Math.round(basal * data.activityFactor) : null,
    waistHip: data.waist > 0 && data.hip > 0 ? Number((data.waist / data.hip).toFixed(2)) : null,
    proteinGrams:
      data.targetCalories > 0 && Number.isFinite(data.proteinPercent)
        ? Math.round((data.targetCalories * data.proteinPercent) / 100 / 4)
        : null,
    carbohydrateGrams:
      data.targetCalories > 0 && Number.isFinite(data.carbohydratePercent)
        ? Math.round((data.targetCalories * data.carbohydratePercent) / 100 / 4)
        : null,
    fatGrams:
      data.targetCalories > 0 && Number.isFinite(data.fatPercent)
        ? Math.round((data.targetCalories * data.fatPercent) / 100 / 9)
        : null,
  };
}
export const scaleScore = (answers: any, count: number) =>
  Array.isArray(answers) &&
  answers.length === count &&
  answers.every((n) => Number.isInteger(n) && n >= 0 && n <= 3)
    ? answers.reduce((a, b) => a + b, 0)
    : null;
export function mergeExtracted(current: any, patch: any, replace = false): any {
  const out = structuredClone(current);
  for (const [key, value] of Object.entries(patch || {})) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      if (replace || !out[key]?.length || out[key].every((v: any) => v === null || v === ''))
        out[key] = structuredClone(value);
      else if (
        value.every((v) => v === null || typeof v === 'number') &&
        out[key].every((v: any) => v === null || typeof v === 'number')
      )
        out[key] = out[key].map((v: any, i: number) => (v === null ? (value[i] ?? null) : v));
    } else if (typeof value === 'object') out[key] = mergeExtracted(out[key] || {}, value, replace);
    else if (replace || out[key] === undefined || out[key] === null || out[key] === '')
      out[key] = value;
  }
  return out;
}
export function legacySpecialtyData(note: any) {
  const code = normalizeSpecialty(note.specialtyCode || note.especialidad),
    out = emptySpecialty(code),
    s = note.subjectiveEvolution || {},
    p = note.physicalExamination || {},
    t = note.therapeuticPlanAdjustment || {};
  if (code === 'TRAUM')
    Object.assign(out, {
      rangeOfMotion: p.rangeOfMotion || '',
      muscleStrength: p.stabilityAndStrength || '',
      distalNeurovascular: p.neurovascularState || '',
      softTissues: p.softTissueState || '',
      functionalActivities: s.functionalActivities || '',
      pharmacologicalModification: t.pharmacologicalModification || '',
      rehabilitationProgression: t.rehabilitationProgression || '',
      nextAppointment: t.nextAppointmentRemoval || '',
    });
  if (code === 'DENT')
    Object.assign(out, {
      gingivalState: p.gingivalAndPeriodontalState || '',
      applianceStatus: p.applianceAndBracketStatus || '',
      restorations: p.enamelAndRestorationState || '',
      occlusion: p.occlusionAndBiteState || '',
      hygiene: s.hygieneAndHabits || '',
      newSymptoms: s.newDentalSymptoms || '',
      nextAppointment: t.recomendacionesProximaCita || '',
      surgicalTechnique: note.tecnicaQuirurgicaYSutura || '',
      healing: note.estadoDelAlveoloYCicatrizacion || '',
    });
  return out;
}

export function resolveFollowupSpecialty(session: any, profile: any = {}): string {
  const specialty = profile.specialtyCode || profile.specialty || '';
  const selected = normalizeSpecialty(specialty);
  if (
    selected !== 'GEN' ||
    /^(GEN|GENERAL|M[EÉ]DICO GENERAL|MEDICINA GENERAL)$/i.test(String(specialty).trim())
  )
    return selected;
  return normalizeSpecialty(session?.especialidades?.[0] || session?.especialidad || 'GEN');
}
