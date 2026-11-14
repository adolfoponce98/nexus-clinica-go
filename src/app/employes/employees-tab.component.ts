import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, UserCheck, Plus, Trash2, Search,
  ArrowLeft, Eye, Edit3, Save, Loader2, Mail, Users,
  Home, Calendar, Building2, Stethoscope, CreditCard, Settings, Cpu,
  Wallet, FileText, UserCog, CheckCircle2, AlertCircle
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';

interface PermissionAction {
  read: boolean;
  write: boolean;
  delete: boolean;
}

interface Empleado {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  role: 'RECEPCIONISTA' | 'AYUDANTE';
  password?: string;
  consultoriosIds: string[];
  permissions: {
    home: PermissionAction;
    calendar: PermissionAction;
    patients: PermissionAction;
    consultorios: PermissionAction;
    services: PermissionAction;
    plans: PermissionAction;
    finances: PermissionAction;
    reports: PermissionAction;
    employees: PermissionAction;
    config: PermissionAction;
    nexusI: PermissionAction;
  };
}

@Component({
  selector: 'app-employees-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './employees-tab.component.html'
})
export class EmployeesComponent implements OnInit {
  private authService = inject(AuthService);

  readonly icons = {
    UserCheck, Plus, Trash2, Search, ArrowLeft,
    Eye, Edit3, Save, Loader2, Mail, Users, Building2,
    CheckCircle2, AlertCircle
  };

  modulesList = [
    { key: 'home', label: 'Home', icon: Home },
    { key: 'calendar', label: 'Calendario', icon: Calendar },
    { key: 'patients', label: 'Pacientes', icon: Users },
    { key: 'consultorios', label: 'Consultorios', icon: Building2 },
    { key: 'services', label: 'Servicios', icon: Stethoscope },
    { key: 'plans', label: 'Planes', icon: CreditCard },
    { key: 'finances', label: 'Finanzas', icon: Wallet },
    { key: 'reports', label: 'Reportes', icon: FileText },
    { key: 'employees', label: 'Empleados', icon: UserCog },
    { key: 'config', label: 'Configuración', icon: Settings },
    { key: 'nexusI', label: 'Nexus I', icon: Cpu },
  ];

  private readonly SAVE_URL = 'https://saveOrUpdateEmployee-o7vmreizjq-uc.a.run.app';
  private readonly GET_URL = 'https://getEmployees-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  searchQuery = '';
  selectedEmpleado = signal<Empleado | null>(null);
  isEditingMode = false;
  activeIdx = 0;
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // 🌟 Estado del Diálogo Modal Personalizado
  dialogModal = signal<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
    onClose?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });

  empleados = signal<Empleado[]>([]);
  availableBranches: any[] = [];

  filteredEmpleados = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.empleados().filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q)
    );
  });

  getPermission(modKey: string): PermissionAction {
    const emp = this.selectedEmpleado();
    if (!emp) return { read: false, write: false, delete: false };

    if (!emp.permissions) {
      emp.permissions = {} as any;
    }

    if (!emp.permissions[modKey as keyof typeof emp.permissions]) {
      emp.permissions[modKey as keyof typeof emp.permissions] = {
        read: false,
        write: false,
        delete: false
      };
    }

    return emp.permissions[modKey as keyof typeof emp.permissions];
  }

  isAnyPermissionActive(emp: Empleado, modKey: string): boolean {
    if (!emp.permissions) return false;
    const modPerms = (emp.permissions as any)[modKey];
    if (!modPerms) return false;
    return !!modPerms.read || !!modPerms.write || !!modPerms.delete;
  }

  ngOnInit() {
    this.cargarSucursalesDisponibles();
    this.cargarEmpleados();
  }

  cargarSucursalesDisponibles() {
    const allBranches = this.authService.getAllBranches();
    if (allBranches && allBranches.length > 0) {
      this.availableBranches = allBranches;
    } else {
      const activeSucursal = this.authService.getSucursal();
      if (activeSucursal) {
        this.availableBranches = [activeSucursal];
      }
    }
  }

  isBranchSelected(branchId: string): boolean {
    const emp = this.selectedEmpleado();
    if (!emp || !emp.consultoriosIds) return false;
    return emp.consultoriosIds.includes(branchId);
  }

  toggleBranchSelection(branchId: string) {
    const emp = this.selectedEmpleado();
    if (!emp) return;

    let currentIds = [...(emp.consultoriosIds || [])];
    if (currentIds.includes(branchId)) {
      currentIds = currentIds.filter(id => id !== branchId);
    } else {
      currentIds.push(branchId);
    }
    this.selectedEmpleado.set({ ...emp, consultoriosIds: currentIds });
  }

  seleccionarTodasSucursales() {
    const emp = this.selectedEmpleado();
    if (!emp) return;
    const allIds = this.availableBranches.map(b => b.idConsultorio || b.id);
    this.selectedEmpleado.set({ ...emp, consultoriosIds: allIds });
  }

  limpiarSucursales() {
    const emp = this.selectedEmpleado();
    if (!emp) return;
    this.selectedEmpleado.set({ ...emp, consultoriosIds: [] });
  }

  async cargarEmpleados() {
    try {
      this.isLoading.set(true);
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) return;

      const activeSucursal = this.authService.getSucursal();
      const idConsultorio = activeSucursal?.idConsultorio || activeSucursal?.id || '';

      if (!idConsultorio) {
        this.isLoading.set(false);
        return;
      }

      const payload = {
        idConsultorio: idConsultorio,
        typeUser: 1
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.GET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al obtener los empleados.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedData.success && Array.isArray(decryptedData.empleados)) {
        const empleadosMapeados = decryptedData.empleados.map((e: any) => ({
          ...e,
          name: e.fullName || e.name || ''
        }));
        this.empleados.set(empleadosMapeados);
      }
    } catch (err) {
      console.error('Error al cargar empleados:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  isPermissionActive(emp: Empleado, modKey: string, action: 'read' | 'write' | 'delete'): boolean {
    if (!emp.permissions) return false;
    const modPerms = (emp.permissions as any)[modKey];
    if (!modPerms) return false;
    return !!modPerms[action];
  }

  addEmpleado() {
    const defaultPermissions: Empleado['permissions'] = {
      home: { read: true, write: false, delete: false },
      calendar: { read: true, write: true, delete: false },
      patients: { read: true, write: true, delete: false },
      consultorios: { read: true, write: false, delete: false },
      services: { read: true, write: false, delete: false },
      plans: { read: false, write: false, delete: false },
      finances: { read: false, write: false, delete: false },
      reports: { read: false, write: false, delete: false },
      employees: { read: false, write: false, delete: false },
      config: { read: false, write: false, delete: false },
      nexusI: { read: false, write: false, delete: false }
    };

    const activeSucursal = this.authService.getSucursal();
    const defaultBranchId = activeSucursal ? [activeSucursal.idConsultorio || activeSucursal.id] : [];

    const nuevo: Empleado = {
      id: '',
      name: '',
      email: '',
      phone: '',
      role: 'RECEPCIONISTA',
      password: '',
      consultoriosIds: defaultBranchId,
      permissions: defaultPermissions
    };

    this.selectedEmpleado.set(nuevo);
    this.isEditingMode = true;
    this.activeIdx = this.empleados().length;
  }

  verDetalle(e: Empleado, index: number) {
    this.selectedEmpleado.set({ ...e });
    this.activeIdx = index;
    this.isEditingMode = false;
  }

  editarEmpleado(e: Empleado, index: number) {
    this.selectedEmpleado.set({ ...e });
    this.activeIdx = index;
    this.isEditingMode = true;
  }

  regresarAListado() {
    this.selectedEmpleado.set(null);
    this.cargarEmpleados();
  }

  restaurarPassword() {
    const nuevaPassword = prompt('Ingrese la nueva contraseña temporal para este empleado:');
    if (nuevaPassword !== null) {
      if (nuevaPassword.trim() === '') {
        this.dialogModal.set({
          isOpen: true,
          title: 'Aviso',
          message: 'La contraseña no puede estar vacía.',
          type: 'error'
        });
        return;
      }
      const emp = this.selectedEmpleado();
      if (emp) {
        this.selectedEmpleado.set({ ...emp, password: nuevaPassword.trim() });
        this.dialogModal.set({
          isOpen: true,
          title: 'Contraseña Actualizada',
          message: 'La contraseña temporal se ha actualizado en memoria. Haga clic en "Guardar" para aplicarla en el servidor.',
          type: 'success'
        });
      }
    }
  }

  async guardarEmpleado() {
    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        this.dialogModal.set({
          isOpen: true,
          title: 'Sesión Expirada',
          message: 'No se encontró una sesión activa. Inicie sesión nuevamente.',
          type: 'error'
        });
        return;
      }

      const empActual = this.selectedEmpleado();
      if (!empActual) return;

      if (!empActual.name.trim() || !empActual.email.trim() || !empActual.role) {
        this.dialogModal.set({
          isOpen: true,
          title: 'Campos Incompletos',
          message: 'El nombre, el correo electrónico y el rol son obligatorios.',
          type: 'error'
        });
        return;
      }

      const esNuevo = !empActual.id || empActual.id === '';
      if (esNuevo && (!empActual.password || empActual.password.trim() === '')) {
        this.dialogModal.set({
          isOpen: true,
          title: 'Contraseña Requerida',
          message: 'La contraseña temporal es obligatoria para nuevos empleados.',
          type: 'error'
        });
        return;
      }

      if (!empActual.consultoriosIds || empActual.consultoriosIds.length === 0) {
        this.dialogModal.set({
          isOpen: true,
          title: 'Sucursal Requerida',
          message: 'Debes seleccionar al menos un consultorio o sucursal para asignar a este empleado.',
          type: 'error'
        });
        return;
      }

      this.isSaving.set(true);

      const payload = {
        id: empActual.id || null,
        name: empActual.name,
        email: empActual.email,
        phone: empActual.phone,
        role: empActual.role,
        password: empActual.password && empActual.password.trim() !== '' ? empActual.password : null,
        consultoriosIds: empActual.consultoriosIds,
        permissions: empActual.permissions
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.SAVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al guardar el empleado.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (!decryptedData.success) {
        throw new Error(decryptedData.error || 'No se pudo completar el registro del empleado.');
      }

      // 🌟 Abrir diálogo de éxito y programar regreso al listado al cerrar
      this.dialogModal.set({
        isOpen: true,
        title: '¡Guardado Exitoso!',
        message: '¡El empleado, sus sucursales y permisos se han guardado con éxito!',
        type: 'success',
        onClose: () => {
          this.selectedEmpleado.set(null);
          this.cargarEmpleados();
        }
      });

    } catch (err: any) {
      console.error('Error al guardar empleado:', err);
      this.dialogModal.set({
        isOpen: true,
        title: 'Error de Servidor',
        message: err.message || 'Error de conexión con el servidor.',
        type: 'error'
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  cerrarDialog() {
    const currentModal = this.dialogModal();
    this.dialogModal.set({ isOpen: false, title: '', message: '', type: 'success' });
    if (currentModal.onClose) {
      currentModal.onClose();
    }
  }

  eliminarEmpleado(id: number | string) {
    if (confirm('¿Estás seguro de revocar el acceso a este empleado?')) {
      this.empleados.update(list => list.filter(e => e.id !== id));
    }
  }
}
