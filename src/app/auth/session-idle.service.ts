import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { SYNC_POLICY } from '../config/sync-policy';

interface ActivityRecord {
  sessionId: string;
  at: number;
  reportedAt?: number;
  lastAttemptAt?: number;
  reportingUntil?: number;
}
@Injectable({ providedIn: 'root' })
export class SessionIdleService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ClinicApiService);
  private readonly router = inject(Router);
  private readonly key = 'cliniq-last-user-activity';
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private exiting = false;
  private lastLocalEvent = 0;
  private readonly activity = () => {
    const now = Date.now();
    if (this.exiting || now - this.lastLocalEvent < 1000) return;
    const session = this.auth.getSession();
    if (!session) return;
    const saved = this.read(session.sessionId);
    if (saved && now - saved.at >= SYNC_POLICY.idleTimeoutMs) {
      void this.expire();
      return;
    }
    this.lastLocalEvent = now;
    this.write({ ...saved, sessionId: session.sessionId, at: now });
    this.check();
  };
  private readonly onVisible = () => this.check();
  start() {
    this.stop();
    this.exiting = false;
    this.lastLocalEvent = 0;
    const session = this.auth.getSession();
    if (!session) return;
    // A reload must not turn an expired local session into new activity.
    if (!this.read(session.sessionId)) this.write({ sessionId: session.sessionId, at: Date.now() });
    this.check();
    this.timer = setInterval(() => this.check(), 15_000);
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'])
      window.addEventListener(event, this.activity, { passive: true });
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('focus', this.onVisible);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'])
      window.removeEventListener(event, this.activity);
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('focus', this.onVisible);
  }
  private read(sessionId: string): ActivityRecord | null {
    try {
      const value = JSON.parse(localStorage.getItem(this.key) || 'null');
      return value?.sessionId === sessionId && Number.isFinite(value.at) ? value : null;
    } catch {
      return null;
    }
  }
  private write(value: ActivityRecord) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
  private check() {
    if (this.exiting) return;
    const session = this.auth.getSession();
    if (!session) return;
    const value = this.read(session.sessionId);
    if (!value) return;
    const now = Date.now();
    if (now - value.at >= SYNC_POLICY.idleTimeoutMs) {
      void this.expire();
      return;
    }
    if (
      document.visibilityState !== 'visible' ||
      this.busy ||
      Number(value.reportingUntil || 0) > now
    )
      return;
    if (value.at <= Number(value.reportedAt || 0)) return;
    const retrying = Number(value.lastAttemptAt || 0) > Number(value.reportedAt || 0);
    const interval = retrying ? SYNC_POLICY.activityRetryMs : SYNC_POLICY.activityReportMs;
    if (value.lastAttemptAt && now - value.lastAttemptAt < interval) return;
    void this.notify(value);
  }
  private async notify(value: ActivityRecord) {
    this.busy = true;
    const attempt = Date.now();
    // Share the attempt and successful watermark across tabs of the same session.
    this.write({ ...value, lastAttemptAt: attempt, reportingUntil: attempt + 30_000 });
    let success = false;
    try {
      await this.api.post(API_URLS.REGISTER_USER_ACTIVITY, {
        timeoutMinutes: 60,
        lastActivityAt: value.at,
      });
      success = true;
    } catch {
      if (!this.auth.getSession()) this.stop();
    } finally {
      const current = this.read(value.sessionId);
      if (current && current.lastAttemptAt === attempt)
        this.write({
          ...current,
          reportingUntil: 0,
          ...(success ? { reportedAt: Math.max(value.at, attempt) } : {}),
        });
      this.busy = false;
    }
  }
  private async expire() {
    if (this.exiting) return;
    this.exiting = true;
    this.stop();
    try {
      await this.auth.logout();
    } finally {
      void this.router.navigate(['/login'], { queryParams: { reason: 'inactivity' } });
    }
  }
}
