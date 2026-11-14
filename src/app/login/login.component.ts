import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme.service';
import * as CryptoJS from 'crypto-js';
import { SPECIALTIES_CATALOG, getSpecialtyName } from './../utils/specialties.constants';
import {
  LucideAngularModule,
  Bike,
  User,
  Lock,
  Zap,
  ShieldCheck,
  Rss,
  Eye,
  EyeOff,
  Building2,
  Calendar as CalendarIcon,
  FileText,
  UserCheck,
  HelpCircle,
  X,
  ArrowLeft
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, ReactiveFormsModule, LucideAngularModule],
  standalone: true,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;
  employeeLoginForm: FormGroup;

  private authService = inject(AuthService);
  themeService = inject(ThemeService);

  readonly bike = Bike;
  readonly Bike = Bike;
  readonly User = User;
  readonly Building2 = Building2;
  readonly Lock = Lock;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Zap = Zap;
  readonly ShieldCheck = ShieldCheck;
  readonly Rss = Rss;
  readonly CalendarIcon = CalendarIcon;
  readonly FileText = FileText;
  readonly UserCheck = UserCheck;
  readonly HelpCircle = HelpCircle;
  readonly X = X;
  readonly ArrowLeft = ArrowLeft;

  userData: any = null;
  showPassword = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');

  // Control de vistas (Portal Clínico vs Acceso Empleados)
  isEmployeeMode = signal(false);

  showForgotPasswordModal = signal(false);
  showRegisterModal = signal(false);
  showSupportModal = signal(false);

  private router = inject(Router);
  private fb = inject(FormBuilder);
  isLoading = signal(false);

  // Credenciales de Seguridad y Endpoints
  private readonly LOGIN_URL = 'https://loginuser-o7vmreizjq-uc.a.run.app';
  private readonly LOGIN_EMPLOYEE_URL = 'https://loginemployee-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.employeeLoginForm = this.fb.group({
      nip: ['', [Validators.required, Validators.minLength(11)]], // 6 dígitos + 5 guiones
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(value => !value);
  }

  toggleEmployeeMode(isEmployee: boolean) {
    this.isEmployeeMode.set(isEmployee);
    this.errorMessage.set('');
  }

  // 🔹 FUNCIÓN PARA FORMATEAR EL NIP CON GUIONES AUTOMÁTICOS
  formatNip(event: any) {
    const input = event.target;
    // Extraer únicamente los dígitos y limitar a máximo 6
    let digits = input.value.replace(/\D/g, '').slice(0, 6);
    // Unir cada dígito con un guion
    let formatted = digits.split('').join('-');

    // Actualizar el valor en el formulario reactivo sin disparar bucles infinitos
    this.employeeLoginForm.get('nip')?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  ngOnInit() {
    this.userData = this.authService.getSession();
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // 🔹 LOGIN PRINCIPAL (DOCTORES / CLÍNICAS)
  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      try {
        const payload = this.loginForm.value;

        const rawPayload = {
          email: payload.email.trim().toLowerCase(),
          password: payload.password
        };

        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), this.ENCRYPTION_KEY).toString();

        const response = await fetch(this.LOGIN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular'
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });

        const jsonRes = await response.json();
        if (!response.ok) {
          throw new Error(jsonRes.error || 'Error en la conexión con el servidor.');
        }

        if (jsonRes.encryptedData) {
          const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
          const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
          const responseData = JSON.parse(decryptedString);

          console.log('🔓 Response desencriptado del servidor (Doctor/Clínica):', responseData);

          if (responseData.success) {
            this.authService.saveSession(responseData);
            this.router.navigate(['/home']);
          } else {
            throw new Error(responseData.error || 'Credenciales incorrectas.');
          }
        } else {
          throw new Error(jsonRes.error || 'Respuesta inválida del servidor.');
        }

      } catch (err: any) {
        console.error('Error en login:', err);
        this.errorMessage.set(err.message || 'Credenciales incorrectas o error de servidor.');
        this.showErrorModal.set(true);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  // 🔹 LOGIN DE EMPLEADOS DE SUCURSALES (Limpia los guiones del NIP antes de cifrar)
  async onEmployeeSubmit() {
    if (this.employeeLoginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      try {
        const payload = this.employeeLoginForm.value;

        const rawPayload = {
          nip: payload.nip ? payload.nip.replace(/-/g, '').trim() : '', // Limpia los guiones dejando solo los 6 dígitos
          email: payload.email.trim().toLowerCase(),
          password: payload.password
        };

        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(rawPayload), this.ENCRYPTION_KEY).toString();

        const response = await fetch(this.LOGIN_EMPLOYEE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular'
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });

        const jsonRes = await response.json();
        if (!response.ok) {
          throw new Error(jsonRes.error || 'Error en la conexión con el servidor de empleados.');
        }

        if (jsonRes.encryptedData) {
          const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
          const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
          const responseData = JSON.parse(decryptedString);

          console.log('🔓 Response desencriptado del servidor (Empleado):', responseData);

          if (responseData.success) {
            this.authService.saveSession(responseData);
            this.router.navigate(['/home']);
          } else {
            throw new Error(responseData.error || 'NIP o credenciales incorrectas.');
          }
        } else {
          throw new Error(jsonRes.error || 'Respuesta inválida del servidor.');
        }

      } catch (err: any) {
        console.error('Error en login de empleados:', err);
        this.errorMessage.set(err.message || 'Credenciales de empleado incorrectas o error de servidor.');
        this.showErrorModal.set(true);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  cerrarModalError() {
    this.showErrorModal.set(false);
  }

  openForgotPasswordModal() {
    this.showForgotPasswordModal.set(true);
  }

  submitForgotPassword() {
    alert('Se han enviado las instrucciones de recuperación a tu correo electrónico.');
    this.showForgotPasswordModal.set(false);
  }

  openRegisterModal() {
    this.router.navigate(['/register']);
  }

  submitRegister() {
    alert('Solicitud de registro enviada con éxito. Nos pondremos en contacto contigo.');
    this.showRegisterModal.set(false);
  }

  openSupportModal() {
    this.showSupportModal.set(true);
  }
}
