
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import {
  LucideAngularModule,
  RotateCcw,
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Store,
  Bell,
  HelpCircle,
  LogOut,
  X,
  Activity
} from 'lucide-angular';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="flex min-h-screen bg-zinc-50 font-sans text-zinc-900">

      <!-- SIDEBAR -->
      <aside class="w-64 bg-zinc-950 flex flex-col p-6 text-zinc-400 shrink-0">
        <div class="flex items-center gap-3 mb-12">
          <img   src="assets/logoh.png" class="w-full h-full object-cover  grayscale" alt="Gym Background">
        </div>
        <div class="flex flex-col items-center justify-center text-center mb-12 w-full">
  <h1 class="text-zinc-400 font-bold uppercase tracking-tight text-xs">
    Sucursal:
    <span class="text-rose-500 font-black text-sm block mt-1">
      {{ userData?.brancheInUser?.[0] || 'BEAST' }}
    </span>
  </h1>
</div>
        <nav class="flex-1 space-y-2">
          <a routerLink="/home" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="LayoutDashboard" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Home</span>
          </a>
          <a routerLink="/calendario" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="LayoutDashboard" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Calendario</span>
          </a>
          <a routerLink="/monitor" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="Activity" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Monitor Cardíaco</span>
          </a>
          <a routerLink="/students" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="Users" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Alumnas</span>
          </a>
          <a routerLink="/staff" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="Briefcase" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Maestras</span>
          </a>
          <a routerLink="/planes" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="CreditCard" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Planes</span>
          </a>
          <a routerLink="/pagos" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="DollarSign" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Pagos</span>
          </a>
          <a routerLink="/sucursales" routerLinkActive="bg-zinc-900 text-white" class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all">
            <lucide-icon [img]="Store" class="w-5 h-5"></lucide-icon>
            <span class="font-bold text-sm">Mi Sucursal</span>
          </a>
        </nav>
      </aside>

      <!-- MAIN CONTENT WRAPPER -->
      <main class="flex-1 flex flex-col h-screen overflow-hidden">
<!-- HEADER -->
<header class="h-20 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-8 flex items-center justify-between shrink-0">

  <!-- BLOQUE IZQUIERDA: Campana, Ayuda y Botón Dar de Alta -->
  <div class="flex items-center gap-6">
    <div class="flex gap-4 text-zinc-400">
      <lucide-icon [img]="Bell" class="w-5 h-5 hover:text-zinc-900 cursor-pointer"></lucide-icon>
      <lucide-icon [img]="HelpCircle" class="w-5 h-5 hover:text-zinc-900 cursor-pointer"></lucide-icon>
    </div>

    <button class="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">
      Dar de Alta
    </button>
  </div>

  <!-- BLOQUE DERECHA: Perfil de usuario y menús -->
  <div class="flex items-center gap-6">
    <div class="relative">
      <div (click)="toggleMenu()"
           class="flex items-center gap-3 pl-6 border-l border-zinc-200 cursor-pointer hover:opacity-80 transition-all">
        <div class="text-right">
          <!-- Muestra el fullName del usuario -->
          <p class="text-xs font-bold text-zinc-900">{{ userData?.fullName || 'Beast' }}</p>
          <!-- Muestra la primera sucursal del array brancheInUser -->
          <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">
            {{ userData?.brancheInUser?.[0] || 'SUCURSAL' }}
          </p>
        </div>
        <!-- Muestra la foto de perfil si existe, de lo contrario usa una por defecto con el nombre -->
        <img [src]="userData?.fotoPerfil || 'https://ui-avatars.com/api/?name=' + (userData?.fullName || 'Admin') + '&background=09090b&color=fff'"
             class="w-10 h-10 rounded-xl object-cover shadow-sm border border-zinc-100" alt="Avatar">
      </div>

      @if (showUserMenu){
       <div class="absolute right-0 mt-4 w-48 bg-white rounded-2xl shadow-2xl shadow-zinc-200 border border-zinc-100 p-2 z-50 animate-in fade-in zoom-in duration-200">
        <button (click)="confirmLogout()"
                class="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors text-sm font-bold">
          <lucide-icon [img]="LogOut" class="w-4 h-4"></lucide-icon>
          Cerrar Sesión
        </button>
       </div>
      }
    </div>

    @if (showLogoutConfirm){
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" (click)="showLogoutConfirm = false"></div>

        <div class="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl shadow-zinc-950/20 animate-in slide-in-from-bottom-4 duration-300">
          <button (click)="showLogoutConfirm = false" class="absolute right-6 top-6 text-zinc-300 hover:text-zinc-500">
            <lucide-icon [img]="X" class="w-5 h-5"></lucide-icon>
          </button>

          <div class="flex flex-col items-center text-center">
            <div class="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
              <lucide-icon [img]="LogOut" class="w-8 h-8"></lucide-icon>
            </div>

            <h3 class="text-xl font-black text-zinc-900 uppercase tracking-tighter mb-2">¿Cerrar Sesión?</h3>
            <p class="text-sm text-zinc-500 font-medium leading-relaxed mb-8">
              Estás a punto de salir de tu cuenta. Deberás ingresar tus credenciales nuevamente para acceder.
            </p>

            <div class="grid grid-cols-2 gap-3 w-full">
              <button (click)="showLogoutConfirm = false"
                      class="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 bg-zinc-50 hover:bg-zinc-100 transition-all">
                Cancelar
              </button>
              <button (click)="logout()"
                      class="py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/30 transition-all">
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  </div>
</header>

        <!-- ROUTER OUTLET -->
        <div class="flex-1 overflow-y-auto p-8">
          <router-outlet></router-outlet>
        </div>

      </main>
    </div>
  `
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  showUserMenu = false;
  showLogoutConfirm = false;
  userData: any = null;

  readonly RotateCcw = RotateCcw;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Briefcase = Briefcase;
  readonly CreditCard = CreditCard;
  readonly DollarSign = DollarSign;
  readonly Store = Store;
  readonly Bell = Bell;
  readonly HelpCircle = HelpCircle;
  readonly LogOut = LogOut;
  readonly X = X;
  readonly Activity = Activity;

  ngOnInit() {
    this.userData = this.authService.getSession();
  }

  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  confirmLogout() {
    this.showUserMenu = false;
    this.showLogoutConfirm = true;
  }

  logout() {
    this.authService.logout();
    this.showLogoutConfirm = false;
    this.router.navigate(['/login']);
  }
}
