import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, Shield, Edit2, X, Check, Save } from 'lucide-angular';
import { collection, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, HttpClientModule],
  templateUrl: './permisos.component.html'
})
export class PermisosComponent implements OnInit, OnDestroy {
  readonly PERMISSION_STRUCTURE: { [key: string]: string[] } = {
    calendario: ['solo_lectura', 'escritura'],
    home: ['alumno', 'planes', 'maestros', 'usuarios', 'horarios', 'tipos_clases', 'bicis', 'checkin', 'informacion_financiera', 'estadisticas', 'resumen_sucursal'],
    alumnas: ['lectura', 'escritura'],
    maestras: ['lectura', 'escritura'],
    planes: ['lectura', 'escritura'],
    pagos: ['lectura', 'escritura'],
    gastos: ['lectura', 'escritura'],
    sucursal: ['lectura', 'escritura'],
    configuracion: ['lectura', 'escritura'],
    permisos: ['lectura', 'escritura']
  };

  readonly icons = { Shield, Edit2, X, Check, Save };

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  users: any[] = [];
  idBranch: string = 'BEAST-TESISTAN';
  adminEmail: string = '';

  showEditDialog = false;
  selectedUser: any = null;
  permissionsForm: { [key: string]: boolean } = {};

  private unsubUsers?: Unsubscribe;

  ngOnInit() {
    const session = this.authService.getSession();
    this.adminEmail = session?.email || 'admin@beast.com';
    this.idBranch = session?.brancheInUser?.[0] || 'BEAST-TESISTAN';

    this.loadUsersFromFirestore();
  }

  ngOnDestroy() {
    if (this.unsubUsers) this.unsubUsers();
  }

  loadUsersFromFirestore() {
    const db = getFirestore();
    const usersRef = collection(db, `usersInSucursal/${this.idBranch}/users`);

    this.unsubUsers = onSnapshot(usersRef, (snapshot) => {
      this.users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullName: data['fullName'] || data['nombre'] || 'Usuario',
          email: data['email'] || '',
          // Soportamos si los permisos están anidados en un objeto "permissions" o planos en el documento
          permissions: data['permissions'] || data || {}
        };
      });
      this.cdr.detectChanges();
    }, error => {
      console.error('Error al cargar usuarios de la sucursal:', error);
    });
  }

  // Devuelve un array con los permisos principales y su estado (true/false) para pintar los chips en la tabla
  getUserPermissionChips(userPermissions: any): { name: string; active: boolean }[] {
    const chips: { name: string; active: boolean }[] = [];
    Object.keys(this.PERMISSION_STRUCTURE).forEach(category => {
      const key = `permission-${category}`;
      const isActive = userPermissions[key] === true;
      chips.push({
        name: category,
        active: isActive
      });
    });
    return chips;
  }

  openEditDialog(user: any) {
    this.selectedUser = user;
    this.permissionsForm = {};

    Object.keys(this.PERMISSION_STRUCTURE).forEach(category => {
      this.permissionsForm[`permission-${category}`] = !!user.permissions[`permission-${category}`];

      this.PERMISSION_STRUCTURE[category].forEach(sub => {
        const key = `permission-${category}_${sub}`;
        this.permissionsForm[key] = !!user.permissions[key];
      });
    });

    this.showEditDialog = true;
  }

  closeEditDialog() {
    this.showEditDialog = false;
    this.selectedUser = null;
    this.permissionsForm = {};
  }

  onSubPermissionChange(category: string) {
    const subs = this.PERMISSION_STRUCTURE[category];
    const allSelected = subs.every(sub => this.permissionsForm[`permission-${category}_${sub}`]);
    this.permissionsForm[`permission-${category}`] = allSelected;
  }

  onParentPermissionChange(category: string) {
    const isChecked = this.permissionsForm[`permission-${category}`];
    const subs = this.PERMISSION_STRUCTURE[category];
    subs.forEach(sub => {
      this.permissionsForm[`permission-${category}_${sub}`] = isChecked;
    });
  }


  savePermissions() {
    if (!this.selectedUser) return;

    const payload = {
      idBranch: this.idBranch,
      emailAdmin: this.adminEmail,
      emailUser: this.selectedUser.email,
      permissions: this.permissionsForm
    };

    this.http.post<{ success: boolean; error?: string }>('https://createpermissions-rdotx3vmaq-uc.a.run.app', payload)
      .subscribe({
        next: () => {
          alert('¡Permisos actualizados correctamente!');
          this.closeEditDialog();
        },
        error: (err) => {
          console.error('Error al guardar permisos:', err);
          alert('Hubo un error al actualizar los permisos en el servidor.');
        }
      });
  }

  objectKeys(obj: object) {
    return Object.keys(obj);
  }
}
