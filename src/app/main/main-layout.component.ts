import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
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
  Activity,
  CheckCircle2
} from 'lucide-angular';

export interface InfoNotification {
  id: string;
  body: string;
  title: string;
  read: boolean;
  type: number;
  timestamp: string;
}

export interface NotificationsResponse {
  error: string;
  count: number;
  notifications: InfoNotification[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, HttpClientModule],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);

  showUserMenu = false;
  showLogoutConfirm = false;
  userData: any = null;

  // Estados para las notificaciones y el loader
  showNotificationsPopup = false;
  isLoadingNotifications = false;
  notificationsList: InfoNotification[] = [];

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
  readonly CheckCircle2 = CheckCircle2;

  ngOnInit() {
    this.userData = this.authService.getSession();
  }

  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  // Método que se ejecuta al hacer clic en la campana
  toggleNotifications() {
    this.showNotificationsPopup = !this.showNotificationsPopup;
    this.showUserMenu = false; // Cierra el menú de usuario si está abierto

    // Si abrimos el popup y aún no tenemos notificaciones, consumimos el servicio
    if (this.showNotificationsPopup && this.notificationsList.length === 0) {
      this.fetchNotifications();
    }
  }

  fetchNotifications() {
    this.isLoadingNotifications = true;
    const bodyRequest = {
      email: this.userData?.email || '',
      downloadAll: true,
      paginationDate: ''
    };

    this.http.post<NotificationsResponse>('https://getnotifications-rdotx3vmaq-uc.a.run.app', bodyRequest)
      .subscribe({
        next: (response) => {
          this.isLoadingNotifications = false;
          if (!response.error) {
            this.notificationsList = response.notifications || [];
          }
        },
        error: (err) => {
          this.isLoadingNotifications = false;
          console.error('Error al obtener notificaciones:', err);
        }
      });
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
