import {
  LucideAngularModule,
  Monitor,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  User,
  Mail,
  Phone,
  Globe,
  Clock,
  Bell,
  LogOut,
  Wifi,
  Check,
  Tablet,
  Layers,
  X,
} from 'lucide-angular';
import { PermissionDirective } from '../../auth/permission.directive';
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OfficeSyncService } from '../../auth/office-sync.service';
import { AuthService } from '../../auth/auth.service';
import { browserDevice } from '../../auth/browser-device';
import { API_URLS } from '../../config/api-urls';
import { SYNC_POLICY } from '../../config/sync-policy';
@Component({
  selector: 'app-connected-devices',
  standalone: true,
  imports: [PermissionDirective, CommonModule, LucideAngularModule],
  templateUrl: './connected-devices.component.html',
  styleUrl: './connected-devices.component.css',
})
export class ConnectedDevicesComponent implements OnInit, OnDestroy {
  private readonly sync = inject(OfficeSyncService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly devices = signal<any[]>([]);
  readonly selected = signal<any>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly icons = {
    Monitor,
    Smartphone,
    ShieldCheck,
    RefreshCw,
    User,
    Mail,
    Phone,
    Globe,
    Clock,
    Bell,
    LogOut,
    Wifi,
    Check,
    Tablet,
    Layers,
    X,
  };
  get onlineCount() {
    return this.devices().filter((d) => d.online).length;
  }
  get pushCount() {
    return this.devices().filter((d) => d.pushEnabled).length;
  }
  deviceIcon(device: any) {
    return /ipad|tablet/i.test([device.name, device.model].join(' '))
      ? Tablet
      : /android|iphone|mobile|phone/i.test([device.name, device.os, device.model].join(' '))
        ? Smartphone
        : Monitor;
  }
  readonly currentId = browserDevice().id;
  private timer?: ReturnType<typeof setInterval>;
  private subscription = this.sync.updates.subscribe((type) => {
    if (type === 'devices') void this.load();
  });
  ngOnInit() {
    void this.load();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.load();
    }, SYNC_POLICY.devicesFallbackMs);
  }
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.subscription.unsubscribe();
  }
  async load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.devices.set((await this.sync.call(API_URLS.GET_CONNECTED_DEVICES)).devices);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }
  async disconnect(device: any) {
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.sync.call(API_URLS.REVOKE_CONNECTED_DEVICE, {
        deviceId: device.id,
        ...(device.userId ? { userId: device.userId } : {}),
        idDoctor: this.auth.getSession()?.idDoctor || this.auth.getSession()?.email,
      });
      this.selected.set(null);
      if (result.currentDevice) {
        await this.auth.logout();
        this.sync.stop();
        await this.router.navigate(['/login']);
      } else await this.load();
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
