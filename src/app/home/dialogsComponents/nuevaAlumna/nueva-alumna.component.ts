import { PermissionDirective } from '../../../auth/permission.directive';
import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, CheckCircle2, AlertCircle } from 'lucide-angular';
import { StudentService, UserDataModelAuth } from '../../../alumnas/alumnas.service';

@Component({
  selector: 'app-nueva-alumna-modal',
  standalone: true,
  imports: [PermissionDirective, CommonModule, FormsModule, LucideAngularModule],
  providers: [StudentService],
  templateUrl: 'nueva-alumna-modal.component.html',
})
export class AlumnaModalComponent implements OnInit {
  constructor(
    private studentService: StudentService,
    private cdr: ChangeDetectorRef, // <--- 1. Inyectamos ChangeDetectorRef
  ) {}

  // Iconos
  readonly X = X;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;
  showFirmaModal = false;
  // Entradas desde el componente padre
  @Input() isOpen = false;
  @Input() isEditing = false;
  @Input() studentData: any = null;
  @Input() idBranch: string = 'BEAST-TESISTAN';

  // Salidas hacia el componente padre
  @Output() close = new EventEmitter<void>();
  @Output() studentSaved = new EventEmitter<any>();

  // Estados locales de control para la API y modups de respuesta
  isLoading = false;
  showSuccessPopup = false;
  showErrorPopup = false;
  errorMessage = '';

  // Modelo local del formulario
  formStudent: any = {
    id: '',
    name: '',
    phone: '',
    email: '',
    password: 'Beast123',
    status: 'ACTIVO',
    avatar: 'https://i.pravatar.cc/150?u=default',
  };

  ngOnInit(): void {
    if (this.studentData) {
      this.formStudent = { ...this.studentData };
    } else {
      this.resetForm();
    }
  }

  ngOnChanges(): void {
    if (this.studentData) {
      this.formStudent = { ...this.studentData };
    } else {
      this.resetForm();
    }
  }

  resetForm() {
    this.formStudent = {
      id: 'SP-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      phone: '',
      email: '',
      password: 'Beast123',
      status: 'ACTIVO',
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
    };
  }

  cerrarModal() {
    this.close.emit();
  }

  guardarAlumno() {
    if (this.isEditing) {
      this.studentSaved.emit(this.formStudent);
      this.showSuccessPopup = true;
      this.cdr.detectChanges(); // Forzar actualización visual
    } else {
      this.isLoading = true;
      const payload: UserDataModelAuth = {
        email: this.formStudent.email,
        password: this.formStudent.password,
        fullName: this.formStudent.name,
        phone: this.formStudent.phone,
        createBy: 'admin@spinpro.com',
        typeCreation: 1,
        idSucursal: this.idBranch,
        tokenFirebase: '',
      };

      this.studentService.registrarAlumna(payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;

          if (response && response.success) {
            this.showSuccessPopup = true;
            this.studentSaved.emit(this.formStudent);
          } else {
            const serverError = response?.error || 'Error desconocido al registrar.';
            this.errorMessage =
              serverError === 'User already exists'
                ? 'El usuario o correo electrónico ya se encuentra registrado en el sistema.'
                : serverError;

            this.showErrorPopup = true;
          }

          // <--- 2. FORZAMOS A ANGULAR A RENDERIZAR EL CAMBIO AL INSTANTE
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error HTTP al registrar alumna', err);

          this.errorMessage = 'Ocurrió un error al conectar con el servidor.';
          this.showErrorPopup = true;

          // <--- 3. FORZAMOS TAMBIÉN EN EL ERROR HTTP
          this.cdr.detectChanges();
        },
      });
    }
  }

  finalizarTodo() {
    this.showSuccessPopup = false;
    this.close.emit();
  }

  // Método para abrir el panel/modal de la firma en pantalla
  abrirModalFirmaResponsiva() {
    this.showFirmaModal = true;
  }
}
