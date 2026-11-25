import { ClinicaGoBackgroundComponent } from '../shared/clinica-go-background.component';
import { ThemeService } from '../theme.service';
import { browserDevice } from '../auth/browser-device';
import { versionedFetch } from '../auth/sync-cache';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SPECIALTIES_CATALOG, getSpecialtyName } from './../utils/specialties.constants';
import {
  LucideAngularModule,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  Plus,
  Trash2,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-angular';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-doctor-register',
  standalone: true,
  imports: [ClinicaGoBackgroundComponent, CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './doctor-register.component.html',
})
export class DoctorRegisterComponent implements OnInit, OnDestroy {
  readonly theme = inject(ThemeService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  readonly specialtiesCatalog = SPECIALTIES_CATALOG;
  readonly icons = {
    User,
    Mail,
    Phone,
    Lock,
    Eye,
    EyeOff,
    Building2,
    MapPin,
    Plus,
    Trash2,
    ImageIcon,
    ArrowLeft,
    CheckCircle2,
    ShieldCheck,
    ArrowRight,
    RefreshCw,
  };

  registerForm: FormGroup;
  currentStep = signal<1 | 2 | 3 | 4>(1);
  // 1: Info Médica y Contraseña
  // 2: Verificación OTP (6 dígitos)
  // 3: Cargando / Procesando OTP y Registro encriptado
  // 4: Pantalla de Éxito

  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // OTP State
  otpValues: string[] = ['', '', '', '', '', ''];
  timerSeconds = 300;
  timerInterval: any;
  resendDisabled = signal(true);

  especialidadesSeleccionadas = signal<string[]>([]);

  // Configuración de Seguridad y Endpoints
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;

  private readonly URL_SEND_OTP = API_URLS.SENDOTP; // Reemplaza con tu URL de sendOtp desplegada
  private readonly URL_VALIDATE_OTP = API_URLS.VERIFYOTP; // Reemplaza con tu URL de validateOtp desplegada
  private readonly URL_REGISTER = API_URLS.REGISTERUSER;

  constructor() {
    this.registerForm = this.fb.group({
      nombreCompleto: ['', [Validators.required]],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit() {}

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  togglePassword() {
    this.showPassword.update((v) => !v);
  }
  toggleConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  get passwordValue(): string {
    return this.registerForm.get('password')?.value || '';
  }
  get hasMinLength(): boolean {
    return this.passwordValue.length >= 8;
  }
  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue);
  }
  get hasNumber(): boolean {
    return /\d/.test(this.passwordValue);
  }
  get hasSpecialChar(): boolean {
    return /[\W_]/.test(this.passwordValue);
  }

  get passwordStrengthPercentage(): number {
    let score = 0;
    if (this.hasMinLength) score += 25;
    if (this.hasUppercase) score += 25;
    if (this.hasNumber) score += 25;
    if (this.hasSpecialChar) score += 25;
    return score;
  }

  get passwordStrengthColor(): string {
    const p = this.passwordStrengthPercentage;
    if (p <= 25) return 'bg-rose-500';
    if (p <= 50) return 'bg-amber-500';
    if (p <= 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  }
  // Reemplaza o asigna la especialidad única seleccionada
  agregarEspecialidad(code: string) {
    if (code) {
      this.especialidadesSeleccionadas.set([code]);
    }
  }

  removerEspecialidad(code: string) {
    this.especialidadesSeleccionadas.set([]);
  }

  translateSpecialty(code: string): string {
    return getSpecialtyName(code);
  }

  // 🚀 PASO 1: Validar campos y consumir servicio SEND OTP
  async proceedToOtp() {
    this.errorMessage.set(null);
    const nombre = this.registerForm.get('nombreCompleto')?.value;
    const correo = this.registerForm.get('correo')?.value;
    const telefono = this.registerForm.get('telefono')?.value;
    const pass = this.registerForm.get('password')?.value;
    const confirmPass = this.registerForm.get('confirmPassword')?.value;

    if (!nombre || !correo || !telefono || !pass || this.registerForm.get('correo')?.invalid) {
      this.errorMessage.set(
        'Por favor completa todos los campos correctamente y verifica tu correo.',
      );
      return;
    }

    if (pass !== confirmPass) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (this.passwordStrengthPercentage < 100) {
      this.errorMessage.set('La contraseña no cumple con todos los requisitos de seguridad.');
      return;
    }

    this.isLoading.set(true);

    try {
      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify({ email: correo }),
        this.ENCRYPTION_KEY,
      ).toString();

      const response = await versionedFetch(this.URL_SEND_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
      });

      const jsonRes = await response.json();
      if (!response.ok) throw new Error('Error al conectar con el servidor');

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const resData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (resData.success) {
        this.isLoading.set(false);
        this.currentStep.set(2); // Avanzar a pantalla de OTP
        this.startOtpTimer();
      } else {
        throw new Error(resData.error || 'No se pudo enviar el código OTP');
      }
    } catch (error: any) {
      this.isLoading.set(false);
      this.errorMessage.set(error.message || 'Error al enviar el código de verificación.');
    }
  }

  startOtpTimer() {
    this.timerSeconds = 300;
    this.resendDisabled.set(true);
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
      } else {
        this.resendDisabled.set(false);
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  onOtpInput(event: any, index: number) {
    const val = event.target.value;
    if (val && /^[0-9]$/.test(val)) {
      this.otpValues[index] = val;
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    } else {
      this.otpValues[index] = '';
    }
  }

  async resendOtp() {
    await this.proceedToOtp();
  }

  // 🚀 PASO 2: Validar OTP -> Validar en Backend -> Registrar en Cloud Function
  async verifyAndRegister() {
    this.errorMessage.set(null);
    const code = this.otpValues.join('');
    const correo = this.registerForm.get('correo')?.value;

    if (code.length < 6) {
      this.errorMessage.set('Por favor ingresa los 6 dígitos completos del código OTP.');
      return;
    }

    this.isLoading.set(true);
    this.currentStep.set(3); // Mostrar Loader (Paso 3)

    try {
      // 1️⃣ Validar OTP
      const payloadValidate = { email: correo, otp: code };
      const cipherValidate = CryptoJS.AES.encrypt(
        JSON.stringify(payloadValidate),
        this.ENCRYPTION_KEY,
      ).toString();

      const valResponse = await versionedFetch(this.URL_VALIDATE_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
        },
        body: JSON.stringify({ encryptedData: cipherValidate }),
      });

      const valJson = await valResponse.json();
      const valBytes = CryptoJS.AES.decrypt(valJson.encryptedData, this.ENCRYPTION_KEY);
      const valResult = JSON.parse(valBytes.toString(CryptoJS.enc.Utf8));

      if (!valResult.success) {
        throw new Error(valResult.error || 'Código OTP inválido o expirado.');
      }

      // 2️⃣ Ejecutar Registro Final
      const payloadRegister = {
        fullName: this.registerForm.get('nombreCompleto')?.value,
        email: correo,
        phone: this.registerForm.get('telefono')?.value,
        password: this.registerForm.get('password')?.value,
        device: browserDevice(),
        especialidades: this.especialidadesSeleccionadas(),
      };

      const cipherRegister = CryptoJS.AES.encrypt(
        JSON.stringify(payloadRegister),
        this.ENCRYPTION_KEY,
      ).toString();

      const regResponse = await versionedFetch(this.URL_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
        },
        body: JSON.stringify({ encryptedData: cipherRegister }),
      });

      const regJson = await regResponse.json();
      const regBytes = CryptoJS.AES.decrypt(regJson.encryptedData, this.ENCRYPTION_KEY);
      const regResult = JSON.parse(regBytes.toString(CryptoJS.enc.Utf8));

      if (regResult.success) {
        this.isLoading.set(false);
        this.currentStep.set(4); // ¡Éxito total! Pantalla final
      } else {
        throw new Error(regResult.error || 'Error al completar el registro en el sistema.');
      }
    } catch (error: any) {
      console.error('Error en proceso:', error);
      this.isLoading.set(false);
      this.currentStep.set(2); // Regresar al paso de OTP para reintentar
      this.errorMessage.set(error.message || 'Ocurrió un error inesperado.');
    }
  }

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}
