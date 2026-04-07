import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'; // Importa estos
import { LucideAngularModule, LayoutDashboard, Users, UserRound, ReceiptText, Settings } from 'lucide-angular';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule], // Añádelos aquí
  templateUrl: './layout.component.html'
})
export class LayoutComponent {
  // Iconos para el menú
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly UserRound = UserRound;
  readonly ReceiptText = ReceiptText;
  readonly Settings = Settings;
}
