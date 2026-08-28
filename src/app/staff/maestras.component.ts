import { Component, signal, computed, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  UserRoundPen,
  Star,
  Plus,
  CheckCircle2,
  UserPlus,
  X,
  Trash2,
  AlertCircle
} from 'lucide-angular';
import { MaestrasService } from './maestras.service';
import { TeacherResponse } from './maestra.model';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule],
  providers: [MaestrasService],
  templateUrl: './maestras.component.html'
})
export class StaffComponent implements OnInit {
  readonly UserRoundPen = UserRoundPen;
  readonly Star = Star;
  readonly Plus = Plus;
   readonly Trash2 = Trash2;
    readonly AlertCircle = AlertCircle;
  readonly CheckCircle2 = CheckCircle2;
  readonly icons = { UserPlus, X, Trash2, AlertCircle };

  isLoading = true;
  selectedStaffId = signal<string | null>(null);
  instructors = signal<TeacherResponse[]>([]);
  idBranch: string = 'BEAST-TESISTAN';

  // Modales y Estados
  showTeacherModal = false;
  showSuccessModal = false;
  successMessage = '';
  showDeleteModal = false;
  teacherToDelete: TeacherResponse | null = null;
  isDeleting = false;
  isSubmitting = false;
// Los 10 colores más distintos y visualmente contrastantes posibles
colorOptions = [
  '#E63946', // Rojo vibrante
  '#457B9D', // Azul acero
  '#2A9D8F', // Verde turquesa / esmeralda
  '#F4A261', // Naranja cálido
  '#9b5de5', // Morado brillante
  '#00F5D4', // Cian brillante
  '#F15BB5', // Rosa neón / magenta
  '#FFB703', // Amarillo oro
  '#3a86ff', // Azul rey intenso
  '#6b705c'  // Gris oliva oscuro neutro
];
  // Formularios
  teacherForm: FormGroup;       // Para el modal (Crear)
  editStaffForm: FormGroup;     // Para el panel lateral (Editar)

  photoPreview: string | null = null;
  photoFile: File | null = null;
  newSkillInput = '';
  skillsList = signal<string[]>([]);


  constructor(
    private maestrasService: MaestrasService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    // Formulario del Modal de Registro
    this.teacherForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      birthDate: [''],
      hireDate: [''],
      colorHex: ['#f43f5e', Validators.required],
      description: ['']
    });

    // Formulario del Panel Lateral de Edición
    this.editStaffForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      email: ['', [Validators.required, Validators.email]],
      colorHex: ['#f43f5e', Validators.required],
      description: ['']
    });

    // Efecto para precargar los datos en el panel lateral cuando cambia la maestra seleccionada
    effect(() => {
      const staff = this.selectedStaff();
      if (staff) {
        this.editStaffForm.patchValue({
          name: staff.name || '',
          phone: staff.phone || '',
          email: staff.email || '',
          colorHex: staff.colorHex || '#f43f5e',
          description: staff.description || ''
        });
      }
    });
  }

  ngOnInit(): void {
    this.obtenerMaestras();
  }

  obtenerMaestras() {
    const request = { branchId: this.idBranch };
    this.maestrasService.obtenerMaestras(request).subscribe({
      next: (response) => {
        if (response.success && response.teachers) {
          this.isLoading = false;
          this.instructors.set(response.teachers);
          if (response.teachers.length > 0 && !this.selectedStaffId()) {
            this.selectedStaffId.set(response.teachers[0].id || null);
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener las maestras:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectedStaff = computed(() =>
    this.instructors().find(i => i.id === this.selectedStaffId())
  );

  selectStaff(id?: string) {
    if (id) {
      this.selectedStaffId.set(id);
    }
  }

  abrirModalCrear() {
    this.teacherForm.reset({ colorHex: '#f43f5e' });
    this.skillsList.set([]);
    this.photoPreview = null;
    this.photoFile = null;
    this.showTeacherModal = true;
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
    this.skillsList.set(this.skillsList().filter(s => s !== skillToRemove));
  }

  // Guardar desde el Modal (Nuevo Maestro)
  async saveTeacher() {
    if (this.teacherForm.invalid) return;
    this.isSubmitting = true;

    try {
      let photoUrl = '';
      if (this.photoFile) {
        const storage = getStorage();
        const filePath = `${this.idBranch}/MAESTROS/${Date.now()}_${this.photoFile.name}`;
        const fileRef = ref(storage, filePath);
        const snapshot = await uploadBytes(fileRef, this.photoFile);
        photoUrl = await getDownloadURL(snapshot.ref);
      }

      const formValues = this.teacherForm.value;
      const payload = {
        branchId: this.idBranch,
        name: formValues.name,
        phone: formValues.phone,
        email: formValues.email,
        birthDate: formValues.birthDate || null,
        hireDate: formValues.hireDate || null,
        colorHex: formValues.colorHex,
        photoUrl: photoUrl || null,
        description: formValues.description || null,
        skills: this.skillsList()
      };

      this.maestrasService.crearMaestro(payload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response && response.success !== false) {
            this.showTeacherModal = false;
            this.successMessage = '¡El maestro se ha registrado correctamente!';
            this.showSuccessModal = true;
            this.obtenerMaestras();
          } else {
            alert('Error al registrar maestro: ' + (response?.error || 'Error desconocido'));
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error HTTP al crear maestro:', err);
          alert('Ocurrió un error al conectar con el servidor.');
          this.cdr.detectChanges();
        }
      });
    } catch (error) {
      this.isSubmitting = false;
      console.error('Error al subir la imagen:', error);
      alert('Error al subir la fotografía.');
      this.cdr.detectChanges();
    }
  }

  // Actualizar desde el Panel Lateral (Usa el mismo servicio de guardado/update)
  actualizarMaestroActual() {
    if (this.editStaffForm.invalid) return;
    const staffActual = this.selectedStaff();
    if (!staffActual) return;

    this.isSubmitting = true;
    const formValues = this.editStaffForm.value;

    const payload = {
      branchId: this.idBranch,
      name: formValues.name,
      phone: formValues.phone,
      email: staffActual.email, // Mantiene el correo original como identificador
      birthDate: staffActual.birthDate || null,
      hireDate: staffActual.hireDate || null,
      colorHex: formValues.colorHex,
      photoUrl: staffActual.photoUrl || null,
      description: formValues.description || null,
      skills: staffActual.skills || []
    };

    this.maestrasService.crearMaestro(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response && response.success !== false) {
          this.successMessage = '¡Los datos del maestro se han actualizado correctamente!';
          this.showSuccessModal = true;
          this.obtenerMaestras();
        } else {
          alert('Error al actualizar: ' + (response?.error || 'Desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Error HTTP al actualizar maestro:', err);
        alert('Ocurrió un error al conectar con el servidor.');
        this.cdr.detectChanges();
      }
    });
  }

  confirmarEliminacion(instructor: TeacherResponse) {
    this.teacherToDelete = instructor;
    this.showDeleteModal = true;
  }

  ejecutarEliminacion() {
    if (!this.teacherToDelete || !this.teacherToDelete.email) return;

    this.isDeleting = true;
    const payload = {
      branchId: this.idBranch,
      idDocumentFirebase: this.teacherToDelete.email.trim()
    };

    this.maestrasService.eliminarMaestro(payload).subscribe({
      next: (response) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        if (response && response.success !== false) {
          this.successMessage = 'Maestro eliminado correctamente. Recuerda actualizar manualmente las clases agendadas.';
          this.showSuccessModal = true;
          this.obtenerMaestras();
        } else {
          alert('Error al eliminar: ' + (response?.error || 'Desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        console.error('Error al eliminar maestro:', err);
        alert('Ocurrió un error al conectar con el servidor.');
        this.cdr.detectChanges();
      }
    });
  }
}
