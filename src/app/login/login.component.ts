import { Component, signal,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Bike,
  User,
  Lock,
  Zap,
  ShieldCheck,
  Rss
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [MatIconModule,ReactiveFormsModule,LucideAngularModule],
  standalone: true, // Asegúrate de que sea standalone
  templateUrl: './login.component.html',
})
export class App {
  loginForm: FormGroup;
readonly bike = Bike;
readonly Bike = Bike;
  readonly User = User;
  readonly Lock = Lock;
  readonly Zap = Zap;
  readonly ShieldCheck = ShieldCheck;
  readonly Rss = Rss;

  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
isLoading = signal(false); // Estado para el loader
  constructor() {
  this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Cambiado a email para el endpoint
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);

      const payload = this.loginForm.value; // Contiene { email, password }
      const url = 'https://login-rdotx3vmaq-uc.a.run.app';
      console.log (payload)

      this.http.post('/api/', payload).subscribe({
        next: (response) => {
          console.log('Login exitoso', response);
          this.router.navigate(['/home']); // Redirección al home
        },
        error: (err) => {
          console.error('Error en login', err);
          alert('Credenciales incorrectas o error de servidor');
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        }
      });
    }
  }
}
