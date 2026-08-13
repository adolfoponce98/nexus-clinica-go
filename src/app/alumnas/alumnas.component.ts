import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { collection, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore'; // SDK estándar
import { Student } from './alumna.model';
import {
  LucideAngularModule,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Eye,
  Edit3,
  Trash2,
  X,
  UserPlus
} from 'lucide-angular';
import { StudentService, UserDataModelAuth } from './alumnas.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [StudentService],
  templateUrl: './alumnas.component.html'
})
export class StudentsComponent implements OnInit, OnDestroy {
  // Iconos
  readonly MoreHorizontal = MoreHorizontal;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly TrendingUp = TrendingUp;
  readonly Eye = Eye;
  readonly Edit3 = Edit3;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly UserPlus = UserPlus;

  // Estados de control
  activeMenuStudentId: string | null = null;
  showModal = false;
  showDetailModal = false;
  isEditing = false;
  private unsubscribe?: Unsubscribe;

  // ID de la sucursal actual
  idBranch: string = 'BEAST-TESISTAN';

  // Modelo del formulario
  selectedStudent: any = {
    id: '',
    name: '',
    phone: '',
    email: '',
    password: 'Beast123',
    status: 'ACTIVO',
    avatar: 'https://i.pravatar.cc/150?u=default'
  };

  students = signal<Student[]>([]);

  // Ya no inyectamos Firestore por constructor, usamos getFirestore() directamente
  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.loadStudentsRealtime(this.idBranch);
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadStudentsRealtime(branchId: string) {
    const db = getFirestore(); // Instancia limpia del SDK estándar
    const suscriptionsRef = collection(db, `suscriptionsBranches/${branchId}/suscriptions`);

    this.unsubscribe = onSnapshot(suscriptionsRef, (snapshot) => {
      const firebaseStudents: Student[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          email: data.email || '',
          fullName: data.fullName || '',
          phone: data.phone || '',
          status: 'ACTIVO',
          createdAt: data.createdAt || '',
          lastCheckIn: data.lastCheckIn || ''
        };
      });

      this.students.set(firebaseStudents);
    }, (error) => {
      console.error('Error al escuchar las suscripciones:', error);
    });
  }

  toggleActionMenu(studentId: string, event: Event) {
    event.stopPropagation();
    this.activeMenuStudentId = this.activeMenuStudentId === studentId ? null : studentId;
  }

  abrirNuevaAlumna() {
    this.isEditing = false;
    this.selectedStudent = {
      id: 'SP-' + Math.floor(1000 + Math.random() * 9000),
      name: '',
      phone: '',
      email: '',
      password: 'Beast123',
      status: 'ACTIVO',
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
    };
    this.showModal = true;
  }

  abrirEditar(student: any) {
    this.isEditing = true;
    this.selectedStudent = { ...student, password: 'Beast123' };
    this.activeMenuStudentId = null;
    this.showModal = true;
  }

  verDetalle(student: any) {
    this.selectedStudent = { ...student };
    this.activeMenuStudentId = null;
    this.showDetailModal = true;
  }

  guardarAlumno() {
    if (this.isEditing) {
      this.students.update(list =>
        list.map(s => s.id === this.selectedStudent.id ? { ...this.selectedStudent } : s)
      );
      this.showModal = false;
    } else {
      const payload: UserDataModelAuth = {
        email: this.selectedStudent.email,
        password: this.selectedStudent.password,
        fullName: this.selectedStudent.name,
        phone: this.selectedStudent.phone,
        createBy: "admin@spinpro.com",
        typeCreation: 1,
        idSucursal: this.idBranch,
        tokenFirebase: ""
      };

      this.studentService.registrarAlumna(payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.showModal = false;
          } else {
            console.error("Error del servidor al registrar:", response.error);
            alert("Error al registrar: " + response.error);
          }
        },
        error: (err) => {
          console.error("Error HTTP al registrar alumna", err);
          alert("Ocurrió un error al conectar con el servidor.");
        }
      });
    }
  }

  borrarAlumno(studentId: string) {
    this.students.update(list => list.filter(s => s.id !== studentId));
    this.activeMenuStudentId = null;
  }

  getStatusClass(status: string) {
    const base = "px-3 py-1 rounded-full text-[8px] font-black tracking-widest ";
    return status === 'ACTIVO'
      ? base + "bg-emerald-100 text-emerald-600"
      : base + "bg-rose-100 text-rose-600";
  }
}


