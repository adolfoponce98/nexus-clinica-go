import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  RotateCcw,
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Store,
  Search,
  Bell,
  HelpCircle,
  Settings
} from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ReactiveFormsModule,
    LucideAngularModule
  ],
  templateUrl: './app.html', // Tu archivo con el Sidebar y Header
})
export class App {
  // Estos nombres son los que usas en el HTML: [img]="Nombre"
  readonly RotateCcw = RotateCcw;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users: any = Users;
  readonly Briefcase = Briefcase;
  readonly CreditCard = CreditCard;
  readonly Search = Search;
  readonly DollarSign =DollarSign;
  readonly Store =Store;
  readonly Bell = Bell;
  readonly HelpCircle = HelpCircle;
  readonly Settings = Settings;
}
