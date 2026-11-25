import { Component, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  Mail,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  LoaderCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from 'lucide-angular';
import { PasswordRecoveryService } from './password-recovery.service';
import { ClinicaGoBackgroundComponent } from '../shared/clinica-go-background.component';
import { ThemeService } from '../theme.service';
@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, ClinicaGoBackgroundComponent],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.css',
})
export class PasswordRecoveryComponent implements OnDestroy {
  readonly recovery = inject(PasswordRecoveryService);
  readonly theme = inject(ThemeService);
  private router = inject(Router);
  readonly icons = {
    Mail,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
    LoaderCircle,
    ArrowLeft,
    ArrowRight,
    Eye,
    EyeOff,
    Check,
    RefreshCw,
  };
  readonly now = signal(Date.now());
  email = this.recovery.email();
  otp = '';
  password = '';
  confirmation = '';
  showPassword = false;
  showConfirmation = false;
  private timer = setInterval(() => this.now.set(Date.now()), 1000);
  get resendSeconds() {
    return Math.max(0, Math.ceil((this.recovery.resendAt() - this.now()) / 1000));
  }
  get codeSeconds() {
    return Math.max(0, Math.ceil((this.recovery.codeExpiresAt() - this.now()) / 1000));
  }
  get clock() {
    const seconds = this.codeSeconds;
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  get checks() {
    return [
      { label: '12 caracteres o más', valid: this.password.length >= 12 },
      {
        label: 'Mayúscula y minúscula',
        valid: /[A-Z]/.test(this.password) && /[a-z]/.test(this.password),
      },
      { label: 'Un número', valid: /\d/.test(this.password) },
      { label: 'Un símbolo', valid: /[^A-Za-z0-9]/.test(this.password) },
    ];
  }
  get canSave() {
    return (
      this.checks.every((check) => check.valid) &&
      this.password === this.confirmation &&
      this.password !== 'ClinicaGo202#' &&
      !this.recovery.busy()
    );
  }
  async requestCode() {
    await this.recovery.requestCode(this.email);
  }
  async verify() {
    await this.recovery.verifyCode(this.otp);
  }
  async resend() {
    if (this.resendSeconds || this.recovery.busy()) return;
    this.otp = '';
    await this.recovery.requestCode(this.recovery.email());
  }
  changeEmail() {
    this.email = this.recovery.email();
    this.recovery.reset();
    this.otp = '';
  }
  async save() {
    if (!this.canSave) return;
    if (await this.recovery.updatePassword(this.password, this.confirmation)) {
      this.password = '';
      this.confirmation = '';
      this.otp = '';
      await this.router.navigate(['/login']);
    }
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    this.password = '';
    this.confirmation = '';
    this.otp = '';
    this.recovery.reset();
  }
}
