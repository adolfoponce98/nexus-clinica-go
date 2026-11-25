import { patientSummary } from '../patient/patient-summary';
import { appointmentPatientLink, isCurrentAppointment } from './appointment-patient';
describe('Appointment identity and current consultation', () => {
  const a = { date: '2026-11-20', time: '13:00', endTime: '14:00', status: 0 };
  it('includes internal and visible identifiers only when a patient was selected', () => {
    expect(appointmentPatientLink(undefined)).toEqual({
      idPaciente: '',
      expedienteId: '',
      numeroDeExpediente: '',
      isExistingPatient: false,
      isNewPatient: true,
    });
    expect(
      appointmentPatientLink({
        idPaciente: 'db-key',
        expedienteId: 'record-key',
        numeroDeExpediente: 'EXP-123456-2026-11-20-000',
      }),
    ).toMatchObject({
      idPaciente: 'db-key',
      expedienteId: 'record-key',
      numeroDeExpediente: 'EXP-123456-2026-11-20-000',
      isExistingPatient: true,
      isNewPatient: false,
    });
  });
  it('keeps both identifiers through the same patient cache mapping used by the portal', () => {
    const cached = patientSummary({
      idPaciente: 'patient-key',
      expedienteId: 'record-key',
      numeroDeExpediente: 'EXP-123456-2026-11-20-000',
      fichaDeIdentificacion: { nombreCompleto: 'Ana' },
    });
    expect(appointmentPatientLink(cached)).toMatchObject({
      idPaciente: 'patient-key',
      expedienteId: 'record-key',
      numeroDeExpediente: 'EXP-123456-2026-11-20-000',
    });
  });
  it('starts at the exact appointment time and stops at its end', () => {
    expect(isCurrentAppointment(a, new Date(2026, 10, 20, 12, 59))).toBe(false);
    expect(isCurrentAppointment(a, new Date(2026, 10, 20, 13, 0))).toBe(true);
    expect(isCurrentAppointment(a, new Date(2026, 10, 20, 13, 59))).toBe(true);
    expect(isCurrentAppointment(a, new Date(2026, 10, 20, 14, 0))).toBe(false);
  });
  it('ignores cancelled and absent appointments and other days; attendance stays available during the slot', () => {
    const now = new Date(2026, 10, 20, 13, 30);
    expect(isCurrentAppointment({ ...a, status: 2 }, now)).toBe(false);
    expect(isCurrentAppointment({ ...a, status: 4 }, now)).toBe(false);
    expect(isCurrentAppointment({ ...a, status: 3 }, now)).toBe(true);
    expect(isCurrentAppointment({ ...a, date: '2026-11-19' }, now)).toBe(false);
  });
  it('supports legacy times and a missing end time using duration', () => {
    expect(
      isCurrentAppointment(
        { ...a, time: '1:00 PM', endTime: '', durationMinutes: 60 },
        new Date(2026, 10, 20, 13, 30),
      ),
    ).toBe(true);
  });
});
