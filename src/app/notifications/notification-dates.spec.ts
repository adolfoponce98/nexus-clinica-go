import { filterNotifications, notificationRange, notificationDate } from './notification-dates';
import { routePermission } from '../auth/permissions';

describe('Notification history date filters', () => {
  it('uses an inclusive Monday–Sunday week across year boundaries', () => {
    expect(notificationRange('2027-01-01', 'week')).toEqual(['2026-12-28', '2027-01-03']);
    expect(notificationRange('2027-01-03', 'week')).toEqual(['2026-12-28', '2027-01-03']);
  });
  it('handles leap years and the complete selected month', () => {
    expect(notificationRange('2028-02-18', 'month')).toEqual(['2028-02-01', '2028-02-29']);
    expect(notificationRange('2026-12-31', 'day')).toEqual(['2026-12-31', '2026-12-31']);
  });
  it('uses local reception date rather than the scheduled appointment date', () => {
    const date = new Date(2026, 10, 25, 23, 30);
    expect(
      notificationDate({ id: '1', updatedAt: date.toISOString(), fechaCita: '2026-12-20' }),
    ).toBe('2026-11-25');
  });
  it('falls back to the appointment date for legacy notifications', () => {
    expect(notificationDate({ id: '1', updatedAt: 'invalid', fechaCita: '2026-11-25' })).toBe(
      '2026-11-25',
    );
  });
  it('includes date boundaries, preserves read flags and returns undated records in full history', () => {
    const items = [
      { id: 'before', fechaCita: '2026-11-22' },
      { id: 'start', fechaCita: '2026-11-23', isRead: true },
      { id: 'end', fechaCita: '2026-11-29' },
      { id: 'after', fechaCita: '2026-11-30' },
      { id: 'legacy' },
    ];
    expect(filterNotifications(items, '2026-11-25', 'week').map((item) => item.id)).toEqual([
      'end',
      'start',
    ]);
    expect(filterNotifications(items, '2026-11-25', 'week')[1].isRead).toBe(true);
    expect(filterNotifications(items, '2026-11-25', 'all')).toHaveLength(5);
    expect(items[0].id).toBe('before');
  });
  it('requires calendar read permissions for notification history', () => {
    expect(routePermission('/notificaciones')).toEqual({ module: 'calendar', action: 'read' });
  });
});
