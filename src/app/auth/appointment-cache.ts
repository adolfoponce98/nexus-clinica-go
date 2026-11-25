import { normalizedTime } from '../appointment-history/appointment-history.utils';

/** Collapse a local/server copy without merging different bookings in a reused slot. */
export function uniqueAppointments(records: any[]): any[] {
  const result: any[] = [],
    index = new Map<string, number[]>();
  const keys = (a: any) => {
    const ids = [a.appointmentId, a.syncId, a.searchDocId, a.id]
      .filter((v) => typeof v === 'string' && v)
      .map((v) => 'id:' + v);
    const time = normalizedTime(a.time);
    if (a.date && time && a.patientName)
      ids.push(
        'slot:' +
          JSON.stringify([
            a.date,
            time,
            String(a.patientName).trim().toLocaleLowerCase('es'),
            String(a.phone || '').replace(/\D/g, ''),
          ]),
      );
    return ids;
  };
  for (const record of records) {
    const aliases = keys(record);
    const candidates = [...new Set(aliases.flatMap((key) => index.get(key) || []))];
    const position = candidates.find((i) => {
      const a = result[i];
      if (a.appointmentId && record.appointmentId) return a.appointmentId === record.appointmentId;
      if (a.idPaciente && record.idPaciente && a.idPaciente !== record.idPaciente) return false;
      return true;
    });
    let at = position;
    if (at === undefined) {
      at = result.length;
      result.push({ ...record });
    } else {
      const old = result[at],
        incomingVersion = Number(record.version || 0),
        oldVersion = Number(old.version || 0);
      result[at] = incomingVersion < oldVersion ? { ...record, ...old } : { ...old, ...record };
    }
    for (const key of [...aliases, ...keys(result[at])]) {
      const matches = index.get(key) || [];
      if (!matches.includes(at)) matches.push(at);
      index.set(key, matches);
    }
  }
  return result;
}
