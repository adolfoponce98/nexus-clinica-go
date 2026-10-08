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
  X
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [MatIconModule, ReactiveFormsModule, LucideAngularModule],
  standalone: true,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loginForm: FormGroup;
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

  userData: any = null;
  showPassword = signal(false);
  showErrorModal = signal(false);
  errorMessage = signal('');

  showForgotPasswordModal = signal(false);
  showRegisterModal = signal(false);
  showSupportModal = signal(false);

  private router = inject(Router);
  private fb = inject(FormBuilder);
  isLoading = signal(false);

  // Credenciales de Seguridad Compartidas con tu Cloud Function
  private readonly LOGIN_URL = 'https://loginuser-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(value => !value);
  }

  ngOnInit() {
    this.userData = this.authService.getSession();
  }

  cerrarSesion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

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

          // 🌟 LOG PARA VISUALIZAR EL RESPONSE DESENCRIPTADO Y EL JWT EN CONSOLA
          console.log('🔓 Response desencriptado del servidor:', responseData);

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
