import { CreationAccessService } from '../planes/creation-access.service';
import { DirectorySkeletonComponent } from '../shared/directory-skeleton.component';
import { PermissionService } from '../auth/permission.service';
import {
  EMPLOYEE_PROFILES,
  EmployeeProfile,
  defaultEmployeePermissions,
  CLINICAL_PERMISSION_MODULES,
} from './employee-permission-presets';
import { PlanUsageComponent } from '../planes/plan-usage.component';
import { BillingService } from '../planes/billing.service';
import { PERMISSION_MODULES, normalizePermissions } from '../auth/permissions';
import { OfficeSyncService } from '../auth/office-sync.service';
import { PermissionDirective } from '../auth/permission.directive';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import { SECURITY_CONFIG } from '../config/security.config';
import { API_URLS } from '../config/api-urls';
import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  UserCheck,
  Plus,
  Trash2,
  Search,
  ArrowLeft,
  Eye,
  Edit3,
  Save,
  Loader2,
  Mail,
  Users,
  Home,
  Calendar,
  Building2,
  Stethoscope,
  CreditCard,
  Settings,
  Cpu,
  Wallet,
  FileText,
  UserCog,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FolderHeart,
  ClipboardList,
  Pill,
  HeartPulse,
  MonitorSmartphone,
  RotateCcw,
  LockKeyhole,
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
  role: EmployeeProfile | 'MEDICO' | 'ENFERMERIA' | '';
  legacyRole?: string;
  password?: string;
  consultoriosIds: string[];
  active?: boolean;
  permissions: Record<string, PermissionAction>;
}

@Component({
  selector: 'app-employees-tab',
  standalone: true,
  imports: [
    DirectorySkeletonComponent,
    PlanUsageComponent,
    PermissionDirective,
    CommonModule,
    FormsModule,
    LucideAngularModule,
  ],
  templateUrl: './employees-tab.component.html',
  styleUrl: './employees-tab.component.css',
})
export class EmployeesComponent implements OnInit {
  readonly billing = inject(BillingService);
  private readonly creationAccess = inject(CreationAccessService);
  private readonly permissions = inject(PermissionService);

  private sessionRequests = inject(TokenInterceptorService);
  private authService = inject(AuthService);

  readonly icons = {
    UserCheck,
    Plus,
    Trash2,
    Search,
    ArrowLeft,
    Eye,
    Edit3,
    Save,
    Loader2,
    Mail,
    Users,
    Building2,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    ShieldCheck,
    RotateCcw,
    LockKeyhole,
  };

  readonly profiles = EMPLOYEE_PROFILES;
  readonly permissionActions = [
    { key: 'read' as const, label: 'Ver', description: 'Lectura', icon: Eye },
    { key: 'write' as const, label: 'Crear / editar', description: 'Escritura', icon: Edit3 },
    { key: 'delete' as const, label: 'Eliminar', description: 'Eliminación', icon: Trash2 },
  ];
  private readonly moduleIcons: Record<string, any> = {
    home: Home,
    calendar: Calendar,
    patients: Users,
    records: FolderHeart,
    followUps: ClipboardList,
    prescriptions: Pill,
    consultorios: Building2,
    services: Stethoscope,
    plans: CreditCard,
    finances: Wallet,
    reports: FileText,
    employees: UserCog,
    config: Settings,
    devices: MonitorSmartphone,
    nexusI: Sparkles,
    usersSystem: UserCog,
    staff: Users,
    nursing: HeartPulse,
  };
  readonly modulesList = Object.entries(PERMISSION_MODULES).map(([key, label]) => ({
    key,
    label: key === 'nexusI' ? 'Nexus IA' : label,
    icon: this.moduleIcons[key] || FileText,
  }));
  readonly mainMenuKeys = [
    'home',
    'calendar',
    'patients',
    'consultorios',
    'employees',
    'services',
    'plans',
    'config',
    'nexusI',
  ];
  readonly permissionGroups = [
    {
      title: 'Menús del sistema',
      description: 'Sin permiso de lectura, el menú no aparecerá en la sesión del empleado.',
      modules: this.modulesList.filter((module) => this.mainMenuKeys.includes(module.key)),
    },
    {
      title: 'Funciones complementarias',
      description: 'Accesos específicos a herramientas y funciones del sistema.',
      modules: this.modulesList.filter((module) => !this.mainMenuKeys.includes(module.key)),
    },
  ];
  get activePermissionsCount() {
    return this.modulesList.filter((module) => this.getPermission(module.key).read).length;
  }
  profileLabel(role: string) {
    return (
      this.profiles.find((profile) => profile.value === role)?.label ||
      (
        {
          MEDICO: 'Médico (perfil anterior)',
          ENFERMERIA: 'Enfermería (perfil anterior)',
        } as Record<string, string>
      )[role] ||
      'Selecciona un perfil'
    );
  }
  get profileDescription() {
    return (
      this.profiles.find((profile) => profile.value === this.selectedEmpleado()?.role)
        ?.description || 'Elige un perfil para cargar sus permisos iniciales.'
    );
  }
  permissionLocked(module: string) {
    return CLINICAL_PERMISSION_MODULES.includes(module);
  }
  applyRolePreset(role: string) {
    const emp = this.selectedEmpleado();
    if (!emp || !this.profiles.some((profile) => profile.value === role)) return;
    this.selectedEmpleado.set({
      ...emp,
      role: role as EmployeeProfile,
      permissions: defaultEmployeePermissions(role as EmployeeProfile),
    });
  }
  setPermission(module: string, action: 'read' | 'write' | 'delete', enabled: boolean) {
    const emp = this.selectedEmpleado();
    if (!emp || !this.isEditingMode || this.permissionLocked(module)) return;
    const permissions = normalizePermissions(emp.permissions);
    permissions[module][action] = enabled;
    if (enabled && action !== 'read') permissions[module].read = true;
    if (action === 'read' && !enabled)
      permissions[module] = { read: false, write: false, delete: false };
    this.selectedEmpleado.set({ ...emp, permissions });
  }

  private readonly SAVE_URL = API_URLS.SAVE_OR_UPDATE_EMPLOYEE;
  private readonly GET_URL = API_URLS.GET_EMPLOYEES;
  private readonly ENCRYPTION_KEY = SECURITY_CONFIG.ENCRYPTION_KEY;
  private readonly APP_SECRET_HEADER = SECURITY_CONFIG.APP_SECRET_HEADER;

  private readonly sync = inject(OfficeSyncService);
  searchQuery = signal('');
  activeCount = computed(() => this.empleados().filter((e) => e.active !== false).length);
  selectedEmpleado = signal<Empleado | null>(null);
  isEditingMode = false;
  activeIdx = 0;
  isLoading = signal<boolean>(true);
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
    type: 'success',
  });

  empleados = signal<Empleado[]>([]);
  availableBranches: any[] = [];

  filteredEmpleados = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.empleados().filter(
      (e) =>
        (e.name || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.role || '').toLowerCase().includes(q),
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
        delete: false,
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

  async cargarSucursalesDisponibles() {
    const allBranches = this.authService.getAllBranches();
    if (allBranches && allBranches.length > 0) {
      this.availableBranches = allBranches;
    } else {
      const activeSucursal = this.authService.getSucursal();
      if (activeSucursal) {
        this.availableBranches = [activeSucursal];
      }
    }
    try {
      const result = await this.sync.call(API_URLS.GETDOCTORSOFFICE);
      this.availableBranches = result.consultorios || this.availableBranches;
    } catch {
      /* Keep the active-office context when disconnected. */
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
      currentIds = currentIds.filter((id) => id !== branchId);
    } else {
      currentIds.push(branchId);
    }
    this.selectedEmpleado.set({ ...emp, consultoriosIds: currentIds });
  }

  seleccionarTodasSucursales() {
    const emp = this.selectedEmpleado();
    if (!emp) return;
    const allIds = this.availableBranches.map((b) => b.idConsultorio || b.id);
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
        typeUser: 1,
      };

      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        this.ENCRYPTION_KEY,
      ).toString();

      const response = await this.sessionRequests.authenticatedFetch(this.GET_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
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
          name: e.fullName || e.name || '',
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
    if (!this.permissions.can('employees', 'write') || !this.creationAccess.allow('employees'))
      return;
    const defaultPermissions = defaultEmployeePermissions('RECEPCIONISTA');

    const activeSucursal = this.authService.getSucursal();
    const defaultBranchId = activeSucursal
      ? [activeSucursal.idConsultorio || activeSucursal.id]
      : [];

    const nuevo: Empleado = {
      id: '',
      name: '',
      email: '',
      phone: '',
      role: 'RECEPCIONISTA',
      password: '',
      consultoriosIds: defaultBranchId,
      permissions: normalizePermissions(defaultPermissions),
    };

    this.selectedEmpleado.set(nuevo);
    this.isEditingMode = true;
    this.activeIdx = this.empleados().length;
  }

  verDetalle(e: Empleado, index: number) {
    this.selectedEmpleado.set({
      ...e,
      legacyRole: this.profiles.some((profile) => profile.value === e.role) ? undefined : e.role,
      role: this.profiles.some((profile) => profile.value === e.role) ? e.role : '',
      permissions: normalizePermissions(structuredClone(e.permissions)),
    });
    this.activeIdx = index;
    this.isEditingMode = false;
  }

  editarEmpleado(e: Empleado, index: number) {
    this.selectedEmpleado.set({
      ...e,
      legacyRole: this.profiles.some((profile) => profile.value === e.role) ? undefined : e.role,
      role: this.profiles.some((profile) => profile.value === e.role) ? e.role : '',
      permissions: normalizePermissions(structuredClone(e.permissions)),
    });
    this.activeIdx = index;
    this.isEditingMode = true;
  }

  regresarAListado() {
    this.selectedEmpleado.set(null);
    this.cargarEmpleados();
  }

  restaurarPassword() {
    const emp = this.selectedEmpleado();
    if (emp) {
      this.selectedEmpleado.set({ ...emp, password: 'GENERAR_TEMPORAL' });
      this.dialogModal.set({
        isOpen: true,
        title: 'Restablecer acceso',
        message:
          'Al guardar se generará una contraseña temporal única. El empleado deberá cambiarla al iniciar sesión.',
        type: 'success',
      });
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
          type: 'error',
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
          type: 'error',
        });
        return;
      }

      const esNuevo = !empActual.id || empActual.id === '';
      if (!empActual.consultoriosIds || empActual.consultoriosIds.length === 0) {
        this.dialogModal.set({
          isOpen: true,
          title: 'Sucursal Requerida',
          message:
            'Debes seleccionar al menos un consultorio o sucursal para asignar a este empleado.',
          type: 'error',
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
        resetPassword: !!empActual.password,
        consultoriosIds: empActual.consultoriosIds,
        permissions: normalizePermissions(empActual.permissions),
      };

      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(payload),
        this.ENCRYPTION_KEY,
      ).toString();

      const response = await this.sessionRequests.authenticatedFetch(this.SAVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({ encryptedData: ciphertext }),
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
        message: decryptedData.temporaryPassword
          ? `Contraseña temporal: ${decryptedData.temporaryPassword}\nCompártela de forma privada. Solo se muestra ahora y debe cambiarse en el primer acceso.`
          : 'El empleado, sus consultorios y permisos se guardaron.',
        type: 'success',
        onClose: () => {
          this.selectedEmpleado.set(null);
          this.cargarEmpleados();
        },
      });
    } catch (err: any) {
      console.error('Error al guardar empleado:', err);
      this.dialogModal.set({
        isOpen: true,
        title: 'Error de Servidor',
        message: err.message || 'Error de conexión con el servidor.',
        type: 'error',
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
    void this.cambiarEstado(id, 'disable');
  }
  async cambiarEstado(id: number | string, action: 'disable' | 'reactivate' | 'permanent') {
    if (
      action === 'reactivate' &&
      (!this.permissions.can('employees', 'write') || !this.creationAccess.allow('employees'))
    )
      return;
    const label =
      action === 'permanent'
        ? 'Eliminar definitivamente sus accesos y cerrar sus sesiones'
        : action === 'reactivate'
          ? 'Reactivar este empleado'
          : 'Deshabilitar al empleado y cerrar sus sesiones';
    if (!confirm(label + '?')) return;
    this.isSaving.set(true);
    try {
      await this.sync.call(API_URLS.DELETEEMPLOYE, { id, action });
      await this.cargarEmpleados();
    } catch (e) {
      this.dialogModal.set({
        isOpen: true,
        title: 'No se pudo actualizar el acceso',
        message: (e as Error).message,
        type: 'error',
      });
    } finally {
      this.isSaving.set(false);
    }
  }
}
