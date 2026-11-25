import { LocalNotificationsService, InfoNotification } from './local-notifications.service';

describe('LocalNotificationsService', () => {
  let service: LocalNotificationsService;
  const context = { user: 'doctor@example.test', branch: 'branch-a' };
  const item: InfoNotification = {
    id: 'n1',
    estadoRespuesta: 'confirmada',
    updatedAt: '2026-11-17',
  };

  beforeEach(() => {
    localStorage.clear();
    service = new LocalNotificationsService();
  });

  it('distinguishes a missing cache from a previously downloaded empty list', () => {
    expect(service.read(context)).toBeNull();
    service.save(context, []);
    expect(new LocalNotificationsService().read(context)).toEqual([]);
  });

  it('persists notifications and local read status across service instances', () => {
    const notifications = service.merge([], [item]);
    expect(notifications[0].isRead).toBe(false);
    notifications[0].isRead = true;
    service.save(context, notifications);
    expect(new LocalNotificationsService().read(context)?.[0].isRead).toBe(true);
  });

  it('isolates the cache by doctor and branch and normalizes email case', () => {
    service.save(context, [item]);
    expect(service.read({ ...context, branch: 'branch-b' })).toBeNull();
    expect(service.read({ ...context, user: 'other@example.test' })).toBeNull();
    expect(service.read({ ...context, user: ' DOCTOR@EXAMPLE.TEST ' })).toHaveLength(1);
  });

  it('preserves history and read status on repeat downloads without trusting server read flags', () => {
    const result = service.merge(
      [{ ...item, isRead: true }],
      [item, item, { id: 'n2', isRead: true }],
    );
    expect(result).toHaveLength(2);
    expect(result.find((n) => n.id === 'n1')?.isRead).toBe(true);
    expect(result.find((n) => n.id === 'n2')?.isRead).toBe(false);
    expect(service.merge(result, [])).toEqual(result);
  });

  it('marks a changed notification unread again', () => {
    const result = service.merge(
      [{ ...item, isRead: true }],
      [{ ...item, estadoRespuesta: 'cancelada' }],
    );
    expect(result[0].isRead).toBe(false);
  });

  it('ignores corrupt or malformed caches', () => {
    service.save(context, [item]);
    const key = localStorage.key(0)!;
    localStorage.setItem(key, '{invalid');
    expect(service.read(context)).toBeNull();
    localStorage.setItem(key, '[{"id":null}]');
    expect(service.read(context)).toBeNull();
  });

  it('keeps functioning and exposes a storage quota error', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      expect(() => service.save(context, [item])).not.toThrow();
      expect(service.storageError).toBe(true);
    } finally {
      Storage.prototype.setItem = original;
    }
    service.save(context, [item]);
    expect(service.storageError).toBe(false);
  });
  it('retains the patient name locally without resetting read status on name enrichment', () => {
    const enriched = service.merge(
      [{ ...item, isRead: true }],
      [{ ...item, patientName: 'María López' }],
    );
    service.save(context, enriched);
    expect(service.read(context)?.[0]).toMatchObject({ patientName: 'María López', isRead: true });
  });
});
