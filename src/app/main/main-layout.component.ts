import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { PanelLeft, PanelLeftClose } from 'lucide-angular';
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
  CheckCircle2,
  Printer,
  Bluetooth,
  RefreshCw,
  Shield,
  UserCog,
  Receipt,
  Calendar
} from 'lucide-angular';
declare global {
  interface Navigator {
    bluetooth: any;
  }
}
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
// En tu clase MainLayoutComponent:
isSidebarCollapsed = false;

readonly PanelLeft = PanelLeft;
readonly PanelLeftClose = PanelLeftClose;

toggleSidebar() {
  this.isSidebarCollapsed = !this.isSidebarCollapsed;
}
  // Estados para las notificaciones
  showNotificationsPopup = false;
  isLoadingNotifications = false;
  notificationsList: InfoNotification[] = [];

  // --- ESTADOS DE IMPRESORA BLUETOOTH ---
  showPrinterModal = false;
  printerStatus: 'disconnected' | 'connected' | 'unconfigured' = 'unconfigured';
  printerName: string = '';
  bluetoothDevices: any[] = [];
  connectedDevice: any | null = null;
  bluetoothServer: any | null = null;

  isScanning = false;

  readonly RotateCcw = RotateCcw;
  readonly LayoutDashboard = LayoutDashboard;
  readonly Users = Users;
  readonly Briefcase = Briefcase;
  readonly CreditCard = CreditCard;
  readonly DollarSign = DollarSign;
  readonly Store = Store;
  readonly  Shield=Shield;
  readonly UserCog=UserCog;
  readonly Receipt=Receipt;
  readonly Calendar =Calendar;
  readonly Bell = Bell;
  readonly HelpCircle = HelpCircle;
  readonly LogOut = LogOut;
  readonly X = X;
  readonly Activity = Activity;
  readonly CheckCircle2 = CheckCircle2;
  readonly Printer = Printer;
  readonly Bluetooth = Bluetooth;
  readonly RefreshCw = RefreshCw;

  ngOnInit() {
    this.userData = this.authService.getSession();
    this.checkSavedPrinter();
  }

  toggleMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleNotifications() {
    this.showNotificationsPopup = !this.showNotificationsPopup;
    this.showUserMenu = false;
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
hasPermission(moduleKey: string): boolean {
  if (!this.userData) return false;

  // Soportamos si los permisos están directamente en userData o en una subpropiedad "permissions"
  const permissions = this.userData.permissions || this.userData;

  // La llave en el JSON tiene el formato "permission-nombre_modulo"
  const permissionKey = `permission-${moduleKey}`;

  // Retorna true solo si el permiso existe explícitamente y es true
  return permissions[permissionKey] === true;
}
  // --- GESTIÓN DE IMPRESORA BLUETOOTH ---

  checkSavedPrinter() {
    const savedPrinterName = localStorage.getItem('beast_printer_name');
    if (savedPrinterName) {
      this.printerName = savedPrinterName;
      this.printerStatus = 'disconnected'; // Por defecto offline hasta que reconecte o intente emparejar
    } else {
      this.printerStatus = 'unconfigured';
    }
  }

  openPrinterModal() {
    this.showPrinterModal = true;
  }

  closePrinterModal() {
    this.showPrinterModal = false;
  }

  async scanBluetoothDevices() {
    if (!navigator.bluetooth) {
      alert('Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge.');
      return;
    }

    try {
      this.isScanning = true;
      // Solicitamos cualquier dispositivo bluetooth cercano con servicios de impresión o genéricos
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb']
      });

      this.connectToDevice(device);
    } catch (error) {
      console.error('Error al buscar dispositivos bluetooth:', error);
      this.isScanning = false;
    }
  }

async connectToDevice(device: any) {
  try {
    this.isScanning = true;
    if (device.gatt) {
      this.bluetoothServer = await device.gatt.connect();
      this.connectedDevice = device;
      this.printerName = device.name || 'Impresora Térmica';
      this.printerStatus = 'connected';

      // Guardar en memoria local
      localStorage.setItem('beast_printer_name', this.printerName);
      localStorage.setItem('beast_printer_id', device.id);

      this.isScanning = false;
      this.closePrinterModal();
    }
  } catch (error) {
    console.error('Error al conectar con la impresora:', error);
    this.isScanning = false;
    alert('No se pudo establecer conexión con la impresora.');
  }
}

  disconnectPrinter() {
    if (this.connectedDevice && this.connectedDevice.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
    }
    this.connectedDevice = null;
    this.bluetoothServer = null;
    this.printerStatus = 'unconfigured';
    this.printerName = '';
    localStorage.removeItem('beast_printer_name');
    localStorage.removeItem('beast_printer_id');
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
