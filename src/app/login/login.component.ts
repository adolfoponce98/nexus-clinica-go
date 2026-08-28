import { Component, signal,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LoginService,LoginUserRequest } from './login.service';
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
   providers: [LoginService],
})
export class LoginComponent {
  loginForm: FormGroup;
  private authService = inject(AuthService);
readonly bike = Bike;
readonly Bike = Bike;
  readonly User = User;
  readonly Lock = Lock;
  readonly Zap = Zap;
  readonly ShieldCheck = ShieldCheck;
  readonly Rss = Rss;
  userData: any = null;
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
isLoading = signal(false); // Estado para el loader
  constructor(private loginService: LoginService) {
  this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]], // Cambiado a email para el endpoint
      password: ['', [Validators.required]]
    });
  }

  ngOnInit() {
    // Obtenemos los datos guardados en la sesión
    this.userData = this.authService.getSession();

    // Ejemplo de uso de los datos del response que guardaste:
    console.log('Token Firebase:', this.userData?.tokenFirebase);
    console.log('Sucursal:', this.userData?.brancheInUser);
  }

  cerrarSesion() {
    this.authService.logout(); // Borra el almacenamiento
    this.router.navigate(['/login']); // Redirige al login
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const payload = this.loginForm.value; // Contiene { email, password }
      console.log (payload)
   // CORRECCIÓN: Estructurarlo como un objeto con las propiedades correctas
      const request: LoginUserRequest = {
        email: payload.email,
        password: payload.password // Asegúrate de que en tu formulario el control se llame 'password' o 'pasword' según corresponda
      };

   this.loginService.login( request).subscribe({
        next: (response) => {
          if(response.success){
          console.log('Login exitoso', response);
          this.authService.saveSession(response);
          this.router.navigate(['/home']); // Redirección al home
          }else{
                  alert('Credenciales incorrectas o error de servidor');
          }

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
