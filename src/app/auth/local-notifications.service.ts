import { Injectable } from '@angular/core';

export interface InfoNotification {
  id: string;
  idAppointment?: string;
  telefono?: string;
  patientName?: string;
  estadoRespuesta?: string;
  mensajeOriginal?: string;
  fechaCita?: string;
  horaCita?: string;
  updatedAt?: string;
  isRead?: boolean;
}

export interface NotificationContext {
  user: string;
  branch: string;
}

@Injectable({ providedIn: 'root' })
export class LocalNotificationsService {
  storageError = false;

  private key(context: NotificationContext): string {
    return (
      'nexus-notifications:v1:' +
      JSON.stringify([context.user.trim().toLowerCase(), context.branch])
    );
  }

  private valid(item: unknown): item is InfoNotification {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as InfoNotification).id === 'string' &&
      !!(item as InfoNotification).id
    );
  }

  read(context: NotificationContext): InfoNotification[] | null {
    try {
      const raw = localStorage.getItem(this.key(context));
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((item) => this.valid(item))) return null;
      return parsed.map((item) => ({ ...item, isRead: item.isRead === true }));
    } catch {
      return null;
    }
  }

  private revision(item: InfoNotification): string {
    return JSON.stringify([
      item.idAppointment,
      item.telefono,
      item.estadoRespuesta,
      item.mensajeOriginal,
      item.fechaCita,
      item.horaCita,
      item.updatedAt,
    ]);
  }

  merge(current: InfoNotification[], incoming: InfoNotification[]): InfoNotification[] {
    const merged = new Map(current.map((item) => [item.id, item]));
    for (const item of incoming) {
      if (!this.valid(item)) continue;
      const previous = merged.get(item.id);
      merged.set(item.id, {
        ...item,
        isRead: !!previous?.isRead && this.revision(previous) === this.revision(item),
      });
    }
    return [...merged.values()].sort((a, b) =>
      (b.updatedAt || '').localeCompare(a.updatedAt || ''),
    );
  }

  save(context: NotificationContext, items: InfoNotification[]): void {
    try {
      localStorage.setItem(this.key(context), JSON.stringify(items));
      this.storageError = false;
    } catch {
      // El panel sigue funcionando si el navegador bloquea el almacenamiento o agota su cuota.
      this.storageError = true;
    }
  }
}
