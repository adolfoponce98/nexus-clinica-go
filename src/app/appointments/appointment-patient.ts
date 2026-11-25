import { localDateKey, normalizedTime } from '../appointment-history/appointment-history.utils';
export const patientId = (p: any) => String(p?.idPaciente || p?.idPatient || p?.id || '');
export const patientName = (p: any) =>
  String(p?.fichaDeIdentificacion?.nombreCompleto || p?.nombre || p?.patientName || '');
export function appointmentPatientLink(patient: any) {
  const id = patientId(patient);
  return {
    idPaciente: id,
    expedienteId: id ? patient.expedienteId || id : '',
    numeroDeExpediente: id ? patient.numeroDeExpediente || patient.expedienteNum || '' : '',
    isExistingPatient: !!id,
    isNewPatient: !id,
  };
}
export function isCurrentAppointment(a: any, now = new Date()): boolean {
  if (a.date !== localDateKey(now) || ![0, 1, 3].includes(Number(a.status ?? 0))) return false;
  const start = normalizedTime(a.time),
    end = normalizedTime(a.endTime);
  if (!start) return false;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const from = minutes(start),
    to = end ? minutes(end) : from + (Number(a.durationMinutes) || 30);
  const current = now.getHours() * 60 + now.getMinutes();
  return from <= current && current < to;
}
