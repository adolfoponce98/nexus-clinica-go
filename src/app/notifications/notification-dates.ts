import { InfoNotification } from '../auth/local-notifications.service';
export type NotificationPeriod = 'day' | 'week' | 'month' | 'all';
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function notificationDate(item: InfoNotification): string {
  if (item.updatedAt) {
    const date = new Date(item.updatedAt);
    if (!Number.isNaN(date.getTime())) return localDateKey(date);
  }
  return item.fechaCita || '';
}
export function notificationRange(anchor: string, period: NotificationPeriod): [string, string] {
  const [y, m, d] = anchor.split('-').map(Number);
  const start = new Date(y, m - 1, d, 12);
  if (period === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'month') start.setDate(1);
  const end = new Date(start);
  if (period === 'week') end.setDate(end.getDate() + 6);
  if (period === 'month') end.setMonth(end.getMonth() + 1, 0);
  return [localDateKey(start), localDateKey(end)];
}
export function filterNotifications(
  items: InfoNotification[],
  anchor: string,
  period: NotificationPeriod,
): InfoNotification[] {
  const [from, to] = notificationRange(anchor, period);
  return items
    .filter(
      (item) =>
        period === 'all' || (notificationDate(item) >= from && notificationDate(item) <= to),
    )
    .slice()
    .sort((a, b) =>
      (b.updatedAt || b.fechaCita || '').localeCompare(a.updatedAt || a.fechaCita || ''),
    );
}
