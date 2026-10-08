import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  UserRound,
  ReceiptText,
  Settings,
  MessageSquare,
  Calendar,
  Bot,
  Smartphone,
  CheckCircle2,
  Layers,
  HelpCircle,
  ChevronRight
} from 'lucide-angular';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  // Iconos para el menú y componentes visuales del sidebar
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly UserRound = UserRound;
  readonly ReceiptText = ReceiptText;
  readonly Settings = Settings;
  readonly MessageSquare = MessageSquare;
  readonly Calendar = Calendar;
  readonly Bot = Bot;
  readonly Smartphone = Smartphone;
  readonly CheckCircle2 = CheckCircle2;
  readonly Layers = Layers;
  readonly HelpCircle = HelpCircle;
  readonly ChevronRight = ChevronRight;
}
