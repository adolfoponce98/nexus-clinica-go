import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  LockKeyhole,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  Check,
  Sun,
  Moon,
  Stethoscope,
  HeartPulse,
  CheckCircle2,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { ThemeService } from '../theme.service';
import { ClinicaGoBackgroundComponent } from '../shared/clinica-go-background.component';
@Component({
  selector: 'app-change-own-password',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, ClinicaGoBackgroundComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent implements OnDestroy {
  readonly theme = inject(ThemeService);
  readonly icons = {
    LockKeyhole,
    KeyRound,
    ShieldCheck,
    Eye,
    EyeOff,
    ArrowRight,
    LogOut,
    Check,
    Sun,
    Moon,
    Stethoscope,
    HeartPulse,
    CheckCircle2,
  };
  showCurrent = false;
  showPassword = false;
  showConfirmation = false;
  requirements = [
    { label: '12 caracteres como mínimo', test: (v: string) => v.length >= 12 },
    { label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
    { label: 'Una letra minúscula', test: (v: string) => /[a-z]/.test(v) },
    { label: 'Un número', test: (v: string) => /\d/.test(v) },
    { label: 'Un símbolo', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
  ];
  get strength() {
    return this.requirements.filter((rule) => rule.test(this.password)).length;
  }

  private auth = inject(AuthService);
  private api = inject(ClinicApiService);
  private router = inject(Router);
  current = '';
  password = '';
  confirmation = '';
  busy = signal(false);
  error = signal('');
  valid() {
    return (
      !!this.current &&
      this.password.length <= 1024 &&
      this.password.length >= 12 &&
      /[a-z]/.test(this.password) &&
      /[A-Z]/.test(this.password) &&
      /\d/.test(this.password) &&
      /[^A-Za-z0-9]/.test(this.password) &&
      this.password === this.confirmation &&
      this.password !== this.current &&
      this.password !== 'ClinicaGo202#'
    );
  }
  async save() {
    if (this.busy() || !this.valid()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post(API_URLS.CHANGE_OWN_PASSWORD, {
        currentPassword: this.current,
        newPassword: this.password,
      });
      this.current = this.password = this.confirmation = '';
      this.auth.clearSession();
      await this.router.navigate(['/login'], { queryParams: { reason: 'password-changed' } });
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.busy.set(false);
    }
  }
  async exit() {
    try {
      await this.auth.logout();
    } finally {
      void this.router.navigate(['/login']);
    }
  }
  ngOnDestroy() {
    this.current = this.password = this.confirmation = '';
  }
}
