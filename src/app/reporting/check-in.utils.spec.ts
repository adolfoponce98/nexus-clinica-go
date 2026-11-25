import { appointmentWindow, pendingCheckIns, reminderId, soundBucket } from './check-in.utils';
describe('Check-in reminder schedule', () => {
  const appointment = {
    date: '2026-11-17',
    time: '13:00',
    endTime: '14:00',
    status: 0,
    patientName: 'Ana',
  };
  const at = (h: number, m = 0) => new Date(2026, 10, 17, h, m).getTime();
  it('starts at the scheduled time and keeps unresolved cards after the end', () => {
    expect(pendingCheckIns([appointment], at(12, 59))).toHaveLength(0);
    expect(pendingCheckIns([appointment], at(13))).toHaveLength(1);
    expect(pendingCheckIns([appointment], at(16))).toHaveLength(1);
  });
  it('has one sound slot per ten minutes and becomes silent at the end', () => {
    expect(soundBucket(appointment, at(12, 59))).toBeNull();
    expect(soundBucket(appointment, at(13))).toBe(0);
    expect(soundBucket(appointment, at(13, 9))).toBe(0);
    expect(soundBucket(appointment, at(13, 10))).toBe(1);
    expect(soundBucket(appointment, at(13, 59))).toBe(5);
    expect(soundBucket(appointment, at(14))).toBeNull();
    expect(soundBucket(appointment, at(15))).toBeNull();
  });
  it('stacks the newest patient first and removes attended, absent and cancelled records', () => {
    const list = [
      appointment,
      { ...appointment, time: '14:00', endTime: '15:00', status: 1 },
      ...[2, 3, 4].map((status) => ({ ...appointment, status })),
    ];
    expect(pendingCheckIns(list, at(14, 30)).map((a) => a.time)).toEqual(['14:00', '13:00']);
  });
  it('keeps a stable ID when the server adds its own appointment identifier and handles midnight', () => {
    expect(reminderId(appointment)).toBe(
      reminderId({ ...appointment, appointmentId: 'server-generated' }),
    );
    const window = appointmentWindow({ ...appointment, time: '23:30', endTime: '00:30' })!;
    expect(window.end - window.start).toBe(3600000);
    expect(appointmentWindow({ ...appointment, time: 'invalid' })).toBeNull();
  });
});
