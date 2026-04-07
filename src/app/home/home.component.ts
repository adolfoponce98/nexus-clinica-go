import { Component } from '@angular/core';
import {
  LucideAngularModule,
  RotateCcw,
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  Settings,
  Search,
  Bell,
  HelpCircle,
  Dumbbell,
  LogOut, AlertCircle, X
} from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  readonly LogOut = LogOut;
  readonly AlertCircle = AlertCircle;
  readonly X = X;

  showUserMenu = false;
  showLogoutConfirm = false;
  // Definición de iconos para Lucide
  readonly RotateCcw = RotateCcw;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Briefcase = Briefcase;
  readonly CreditCard = CreditCard;
  readonly Settings = Settings;
  readonly Search = Search;
  readonly Bell = Bell;
  readonly HelpCircle = HelpCircle;
  readonly Dumbbell = Dumbbell;


  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  confirmLogout() {
    this.showUserMenu = false;
    this.showLogoutConfirm = true;
  }

  logout() {
    console.log('Cerrando sesión...');
    // Aquí iría tu lógica de AuthService.logout()
    this.showLogoutConfirm = false;
  }
}
