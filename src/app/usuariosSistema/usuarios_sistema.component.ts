import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import {
  LucideAngularModule,
  UserRoundPen,
  Star,
  Plus,
  CheckCircle2,
  UserPlus,
  X,
  Trash2,
  AlertCircle,
  Shield,
  HeadsetIcon,
  GraduationCap,
} from 'lucide-angular';
import { UsersSystemService, SystemUser } from './usuarios_sistema.service';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Unsubscribe } from 'firebase/firestore';

@Component({
  selector: 'app-users-system',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule],
  providers: [UsersSystemService],
  templateUrl: 'usuarios_sistem.component.html',
})
export class UsersSystemComponent implements OnInit, OnDestroy {
  readonly UserRoundPen = UserRoundPen;
  readonly Star = Star;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly AlertCircle = AlertCircle;
  readonly CheckCircle2 = CheckCircle2;
  readonly icons = { UserPlus, X, Trash2, AlertCircle, Shield, HeadsetIcon, GraduationCap };

  isLoading = true;
  selectedUserId = signal<string | null>(null);
  systemUsers = signal<SystemUser[]>([]);
  idBranch: string = 'BEAST-TESISTAN';
  private unsubUsers?: Unsubscribe;

  // Modales y Estados
  showUserModal = false;
  showSuccessModal = false;
  successMessage = '';
  showDeleteModal = false;
  userToDelete: SystemUser | null = null;
  isDeleting = false;
  isSubmitting = false;

  // Catálogo de los 10 colores más contrastantes
  colorOptions = [
    '#E63946',
    '#457B9D',
    '#2A9D8F',
    '#F4A261',
    '#9b5de5',
    '#00F5D4',
    '#F15BB5',
    '#FFB703',
    '#3a86ff',
    '#6b705c',
  ];

  // Formularios
  userForm: FormGroup; // Para el modal (Crear)
  editUserForm: FormGroup; // Para el panel lateral (Editar)

  photoPreview: string | null = null;
  photoFile: File | null = null;
  newSkillInput = '';
  skillsList = signal<string[]>([]);

  constructor(
    private usersSystemService: UsersSystemService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    // Formulario del Modal de Registro
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      typeUser: [1, Validators.required], // 1: Recepción, 2: Administración, 3: Maestro
      birthDate: [''],
      hireDate: [''],
      colorHex: ['#E63946', Validators.required],
      description: [''],
    });

    // Formulario del Panel Lateral de Edición
    this.editUserForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      password: [''], // Opcional al editar
      typeUser: [1, Validators.required],
      colorHex: ['#E63946', Validators.required],
      description: [''],
    });

    // Efecto para precargar los datos en el panel lateral
    effect(() => {
      const user = this.selectedUser();
      if (user) {
        this.editUserForm.patchValue({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          typeUser: user.typeUser || 1,
          colorHex: user.colorHex || '#E63946',
          description: user.description || '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.suscribirUsuarios();
  }

  ngOnDestroy(): void {
    if (this.unsubMonitor) {
      this.unsubMonitor();
    }
    if (this.unsubUsers) {
      this.unsubUsers();
    }
  }

  private unsubMonitor?: Unsubscribe;

  suscribirUsuarios() {
    this.isLoading = true;
    this.unsubUsers = this.usersSystemService.escucharUsuarios(this.idBranch, (users) => {
      this.isLoading = false;
      this.systemUsers.set(users);
      if (users.length > 0 && !this.selectedUserId()) {
        this.selectedUserId.set(users[0].email || users[0].id || null);
      }
      this.cdr.detectChanges();
    });
  }

  selectedUser = computed(() =>
    this.systemUsers().find(
      (u) => u.email === this.selectedUserId() || u.id === this.selectedUserId(),
    ),
  );

  selectUser(id?: string) {
    if (id) {
      this.selectedUserId.set(id);
    }
  }

  getTypeUserLabel(type: number): string {
    switch (type) {
      case 2:
        return 'Administración';
      case 1:
        return 'Recepción';
      case 3:
        return 'Maestro / Coach';
      default:
        return 'Usuario';
    }
  }

  getTypeUserBadgeClass(type: number): string {
    switch (type) {
      case 2:
        return 'bg-purple-100 text-purple-700';
      case 1:
        return 'bg-cyan-100 text-cyan-700';
      case 3:
        return 'bg-lime-100 text-lime-700';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  }

  abrirModalCrear() {
    this.userForm.reset({ colorHex: '#E63946', typeUser: 1 });
    this.skillsList.set([]);
    this.photoPreview = null;
    this.photoFile = null;
    this.showUserModal = true;
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  addSkill() {
    if (this.newSkillInput.trim()) {
      const current = this.skillsList();
      if (!current.includes(this.newSkillInput.trim())) {
        this.skillsList.set([...current, this.newSkillInput.trim()]);
      }
      this.newSkillInput = '';
    }
  }

  removeSkill(skillToRemove: string) {
    this.skillsList.set(this.skillsList().filter((s) => s !== skillToRemove));
  }

  // Guardar Nuevo Usuario de Sistema
  async saveUser() {
    if (this.userForm.invalid) return;
    this.isSubmitting = true;

    try {
      let photoUrl = '';
      if (this.photoFile) {
        const storage = getStorage();
        const filePath = `${this.idBranch}/USERS_SYSTEM/${Date.now()}_${this.photoFile.name}`;
        const fileRef = ref(storage, filePath);
        const snapshot = await uploadBytes(fileRef, this.photoFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      const formValues = this.userForm.value;
      const payload = {
        branchId: this.idBranch,
        name: formValues.name,
        typeUser: Number(formValues.typeUser),
        password: formValues.password,
        phone: formValues.phone,
        email: formValues.email,
        birthDate: formValues.birthDate || null,
        hireDate: formValues.hireDate || null,
        colorHex: formValues.colorHex,
        photoUrl: photoUrl || null,
        description: formValues.description || null,
        skills: this.skillsList(),
      };

      this.usersSystemService.crearOActualizarUsuario(payload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response && response.success !== false) {
            this.showUserModal = false;
            this.successMessage = '¡El usuario del sistema se ha registrado correctamente!';
            this.showSuccessModal = true;
          } else {
            alert('Error al registrar usuario: ' + (response?.error || 'Error desconocido'));
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error HTTP al crear usuario:', err);
          alert('Ocurrió un error al conectar con el servidor.');
          this.cdr.detectChanges();
        },
      });
    } catch (error) {
      this.isSubmitting = false;
      console.error('Error al subir la imagen:', error);
      alert('Error al subir la fotografía.');
      this.cdr.detectChanges();
    }
  }

  // Actualizar Usuario Existente
  actualizarUsuarioActual() {
    if (this.editUserForm.invalid) return;
    const userActual = this.selectedUser();
    if (!userActual) return;

    this.isSubmitting = true;
    const formValues = this.editUserForm.value;

    const payload = {
      branchId: this.idBranch,
      name: formValues.name,
      typeUser: Number(formValues.typeUser),
      password: formValues.password ? formValues.password : undefined, // Si va vacío no se sobreescribe o lo maneja el backend
      phone: formValues.phone,
      email: userActual.email, // Llave primaria / identificador
      birthDate: userActual.birthDate || null,
      hireDate: userActual.hireDate || null,
      colorHex: formValues.colorHex,
      photoUrl: userActual.photoUrl || null,
      description: formValues.description || null,
      skills: userActual.skills || [],
    };

    this.usersSystemService.crearOActualizarUsuario(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response && response.success !== false) {
          this.successMessage = '¡Los datos del usuario se han actualizado correctamente!';
          this.showSuccessModal = true;
        } else {
          alert('Error al actualizar: ' + (response?.error || 'Desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error HTTP al actualizar usuario:', err);
        alert('Ocurrió un error al conectar con el servidor.');
        this.cdr.detectChanges();
      },
    });
  }

  confirmarEliminacion(user: SystemUser) {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  ejecutarEliminacion() {
    if (!this.userToDelete || !this.userToDelete.email) return;

    this.isDeleting = true;
    const payload = {
      branchId: this.idBranch,
      email: this.userToDelete.email.trim(),
    };

    this.usersSystemService.eliminarUsuario(payload).subscribe({
      next: (response) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        if (response && response.success !== false) {
          this.successMessage = 'Usuario eliminado del sistema correctamente.';
          this.showSuccessModal = true;
        } else {
          alert('Error al eliminar: ' + (response?.error || 'Desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        console.error('Error al eliminar usuario:', err);
        alert('Ocurrió un error al conectar con el servidor.');
        this.cdr.detectChanges();
      },
    });
  }
}
