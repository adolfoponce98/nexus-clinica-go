import { uniqueAppointments } from './appointment-cache';
describe('Appointment cache identity', () => {
  const a = {
    date: '2030-01-01',
    time: '09:00',
    patientName: 'Ana',
    phone: '1234567890',
    status: 0,
  };
  it('merges the locally saved and synchronized copies even when their sync IDs differ', () => {
    const rows = uniqueAppointments([
      { ...a, syncId: 'local' },
      { ...a, syncId: 'server', appointmentId: 'canonical', version: 1 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].appointmentId).toBe('canonical');
    expect(rows[0].syncId).toBe('server');
  });
  it('uses canonical identity across a patient link and ignores older duplicate versions', () => {
    const rows = uniqueAppointments([
      { ...a, appointmentId: 'same', idPaciente: 'temporary', version: 1 },
      { ...a, appointmentId: 'same', idPaciente: 'registered', version: 2 },
      { ...a, appointmentId: 'same', version: 1, status: 0 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].idPaciente).toBe('registered');
    expect(rows[0].version).toBe(2);
  });
  it('keeps a cancelled booking distinct from a replacement in the same time slot', () => {
    expect(
      uniqueAppointments([
        { ...a, appointmentId: 'cancelled', status: 2 },
        { ...a, appointmentId: 'new', status: 0 },
      ]),
    ).toHaveLength(2);
  });
});
