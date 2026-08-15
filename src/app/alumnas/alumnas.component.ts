import { Component, signal, OnInit, OnDestroy,ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { collection, doc, getDoc,getDocs, onSnapshot, Unsubscribe, getFirestore,query,orderBy,limit,documentId } from 'firebase/firestore';
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
  UserPlus,
  Package,
  CreditCard,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-angular';
import { StudentService, UserDataModelAuth } from './alumnas.service';

// Interfaces basadas en tu estructura de datos
export interface CurrentPackageInfo {
  idPaquete: string;
  precio: number;
  clasesTomadas: number;
  clasesTotales: number;
  tipoPaquete: number;
  expiracion: string;
  name: string;
}

export interface ClassHistory {
  coach: string;
  name: string;
  time: string;
  duration: number;
  level: number;
  agenda: number;
  total: number;
  photo: string;
  status: string;
  isScheduled: boolean;
}

export interface PaymentHistory {
  conceptoPagoId: string;
  monto: string;
  metodoPago: string;
  fechaRegistro: string;
}
export interface PaqueteMemberShipModel {
  idPaquete: string;
  name: string;
  descripcion: string;
  tipoMmebresia: number;
  creditos: number;
  precioRegular: number;
  precioDescuento: number;
  beneficios: string[];
  fechaCreacion: string;
  idAdmin: string;
  idBranch: string;
}

export interface AllDataProfile {
  createdAt: string;
  fullName: string;
  phone: string;
  email: string;
  lastCheckIn: string;
  urlDocumentResponsiva: string;
  memberShipName: string;
  fotoPerfil: string;
  idSocio: string;
  nipSocio: string;
  status: number;
  tokenFirebase: string;
  brancheInUser: string[];
  activePackage: CurrentPackageInfo;
  historyClasses: ClassHistory[];
  pagos: PaymentHistory[];
}

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
  readonly Package = Package;
  readonly CreditCard = CreditCard;
  readonly Clock = Clock;
  readonly Calendar = Calendar;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertCircle = AlertCircle;

  showAsignarPaqueteSection = false;
  isLoadingMembresias = false;
  isAssigningPackage = false;
  listaMembresias: PaqueteMemberShipModel[] = [];
  selectedMembresiaId: string | null = null;
  showSuccessPopup = false;

  showDeleteConfirmModal = false;
  isDeletingPackage = false;
  isChangingPackage = false;

  // Estados de control
  activeMenuStudentId: string | null = null;
  showModal = false;
  showDetailModal = false;
  isEditing = false;
  isLoadingProfile = false;
  private unsubscribe?: Unsubscribe;
  private unsubscribeProfile?: Unsubscribe;

  // ID de la sucursal actual
  idBranch: string = 'BEAST-TESISTAN';

  // Modelo del formulario para crear/editar
  selectedStudent: any = {
    id: '',
    name: '',
    phone: '',
    email: '',
    password: 'Beast123',
    status: 'ACTIVO',
    avatar: 'https://i.pravatar.cc/150?u=default'
  };

  // Perfil completo detallado que se consumirá de users -> email
  currentStudentProfile: AllDataProfile | null = null;

  students = signal<Student[]>([]);

  constructor(private studentService: StudentService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadStudentsRealtime(this.idBranch);
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.unsubscribeProfile) {
      this.unsubscribeProfile();
    }
  }

  // 1. Mostrar modal de confirmación antes de eliminar
  confirmarEliminarPaquete() {
    this.showDeleteConfirmModal = true;
  }

  // 2. Consumir el servicio para eliminar el paquete
  ejecutarEliminacionPaquete() {
    if (!this.currentStudentProfile || !this.currentStudentProfile.email) return;

    this.isDeletingPackage = true;
    const emailEstudiante = this.currentStudentProfile.email;
    const apiUrl = 'https://removeuserpackage-rdotx3vmaq-uc.a.run.app';

    const requestBody = { email: emailEstudiante };

    this.studentService.asignarMembresiaAPI(apiUrl, requestBody).subscribe({
      next: (response: any) => {
        this.isDeletingPackage = false;
        this.showDeleteConfirmModal = false;

        if (response && response.success) {
          alert("Paquete eliminado con éxito");
          // Actualizamos localmente el estado del paquete a vacío/"-"
          if (this.currentStudentProfile) {
            this.currentStudentProfile.activePackage = {
              idPaquete: '-',
              precio: 0,
              clasesTomadas: 0,
              clasesTotales: 0,
              tipoPaquete: 1,
              expiracion: '-',
              name: '-'
            };
          }
        } else {
          alert("Error al eliminar paquete: " + (response?.error || 'Error desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isDeletingPackage = false;
        this.showDeleteConfirmModal = false;
        console.error("Error HTTP al eliminar paquete:", err);
        alert("Ocurrió un error al conectar con el servidor.");
        this.cdr.detectChanges();
      }
    });
  }

  // 3. Reutilizar la sección de asignación para cuando elige "Cambiar Paquete"
  abrirCambiarPaquete() {
    // Reutilizamos el método que ya carga las membresías de la sucursal
    this.abrirSeccionAsignarPaquete();
  }
  loadStudentsRealtime(branchId: string) {
    const db = getFirestore();
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
    this.activeMenuStudentId = null;
    this.showDetailModal = true;
    this.isLoadingProfile = true;
    this.currentStudentProfile = null;

    const db = getFirestore();
    const userEmail = student.email ? student.email.trim() : '';

    if (!userEmail) {
      console.warn("El estudiante no cuenta con un correo válido. Usando datos básicos.");
      this.cargarDatosFallback(student);
      return;
    }

    const userDocRef = doc(db, 'users', userEmail);
    // Referencia a la subcolección pagos del usuario
    const userPagosRef = collection(db, 'users', userEmail, 'pagos');
// Nueva referencia para HISTORIAL_CLASSES (limitada a 5)
   const historialRef = query(
  collection(db, 'users', userEmail, 'HISTORIAL_CLASSES'),
  orderBy(documentId(), 'desc'), // Ordena por el ID del documento (la fecha)
  limit(5)
);
    let responded = false;

    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.warn("La consulta a 'users' tardó demasiado. Cargando datos de respaldo.");
        this.cargarDatosFallback(student);
      }
    }, 3000);

    // Ejecutamos ambas consultas en paralelo para mayor velocidad
    Promise.all([
      getDoc(userDocRef),
      getDocs(userPagosRef),
      getDocs(historialRef) // Nueva consulta
    ]).then(([docSnap, pagosSnap,historialSnap]) => {
      if (!responded) {
        responded = true;
        clearTimeout(timeout);

        if (docSnap.exists()) {
          // Extraemos los datos principales del perfil
          const profileData = docSnap.data() as AllDataProfile;

          // Mapeamos los documentos de la subcolección pagos
        // Mapeamos los documentos tipándolos correctamente
const listaPagos: PaymentHistory[] = pagosSnap.docs.map(pagoDoc => {
  const data = pagoDoc.data();
  return {
    id: pagoDoc.id,
    branchId: data['branchId'],
    monto: data['monto'],
    emailAlumno: data['emailAlumno'],
    emailRecepcion: data['emailRecepcion'],
    metodoPago: data['metodoPago'],
    concepto: data['concepto'],
    conceptoPagoId: data['conceptoPagoId'],
    fechaRegistro: data['fechaRegistro'],
    timestamp: data['timestamp']
  } as PaymentHistory;
});
const listaHistorial = historialSnap.docs.map(classDoc => {
  const data = classDoc.data() as any;
  return {
    id: classDoc.id,
    fecha: data.fecha || '',
    hora: data.hora || '',
    sucursal: data.sucursal || '',
  };
}) as unknown as ClassHistory[]; // <--- Doble casting aquí

          // Inyectamos la lista de pagos dentro del objeto del perfil
          // (Asegúrate de que tu interfaz AllDataProfile tenga opcional o definida la propiedad 'pagos')
          this.currentStudentProfile = {
            ...profileData,
            pagos: listaPagos,
            historyClasses: listaHistorial // Asegúrate de que este campo exista en AllDataProfile
          };

          console.log("Perfil y pagos cargados exitosamente:", this.currentStudentProfile);
        } else {
          console.warn("No se encontró el documento exacto en 'users' para:", userEmail);
          this.cargarDatosFallback(student);
        }

        this.isLoadingProfile = false;
        this.cdr.detectChanges(); // Fuerza a Angular a renderizar la vista al instante
      }
    }).catch((error) => {
      if (!responded) {
        responded = true;
        clearTimeout(timeout);
        console.error("Error al obtener el perfil completo y sus pagos:", error);
        this.cargarDatosFallback(student);
      }
    });
  }

  private cargarDatosFallback(student: any) {
    this.currentStudentProfile = {
      createdAt: student.createdAt || '-',
      fullName: student.fullName || '-',
      phone: student.phone || '-',
      email: student.email || '-',
      lastCheckIn: student.lastCheckIn || '-',
      urlDocumentResponsiva: '',
      memberShipName: '-',
      fotoPerfil: student.avatar || 'https://i.pravatar.cc/150?u=default',
      idSocio: student.id || '-',
      nipSocio: '-',
      status: 1,
      tokenFirebase: '',
      brancheInUser: [this.idBranch],
      activePackage: {
        idPaquete: '-',
        precio: 0,
        clasesTomadas: 0,
        clasesTotales: 0,
        tipoPaquete: 1,
        expiracion: '-',
        name: '-'
      },
      historyClasses: [],
      pagos: []
    };
    this.isLoadingProfile = false;
    this.cdr.detectChanges(); // <--- FUERZA TAMBIÉN EN EL FALLBACK
  }


  // Método para simular o disparar la asignación de paquete cuando no tiene activo
  asignarPaquetePrompt() {
    alert("Redirigiendo al módulo de asignación de paquetes o abriendo modal de planes.");
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

  getStatusClass(status: any) {
    const base = "px-3 py-1 rounded-full text-[8px] font-black tracking-widest ";
    const isActive = status === 'ACTIVO' || status === 1;
    return isActive
      ? base + "bg-emerald-100 text-emerald-600"
      : base + "bg-rose-100 text-rose-600";
  }

  // Método para cuando el usuario hace clic en "Asignar Paquete"
  abrirSeccionAsignarPaquete() {
    this.showAsignarPaqueteSection = true;
    this.isLoadingMembresias = true;
    this.selectedMembresiaId = null;
    this.listaMembresias = [];

    const db = getFirestore();
    // Ruta solicitada: membresias -> sucursal -> membresias
    const membresiasRef = collection(db, 'membresias', this.idBranch, 'membrecias');
    console.log(membresiasRef)

    getDocs(membresiasRef).then((snapshot) => {
      const membresias: PaqueteMemberShipModel[] = [];
        console.log(snapshot)
      snapshot.forEach((docSnap) => {
        membresias.push(docSnap.data() as PaqueteMemberShipModel);
      });
      this.listaMembresias = membresias;
      this.isLoadingMembresias = false;
      this.cdr.detectChanges();
    }).catch((error) => {
      console.error("Error al obtener las membresías:", error);
      this.isLoadingMembresias = false;
      this.cdr.detectChanges();
    });
  }

  seleccionarMembresia(idPaquete: string) {
    this.selectedMembresiaId = idPaquete;
  }

  // Método para consumir el servicio de asignación
  confirmarAsignacionMembresia() {
    if (!this.selectedMembresiaId || !this.currentStudentProfile) {
      alert("Por favor selecciona una membresía.");
      return;
    }

    this.isAssigningPackage = true;
    const emailEstudiante = this.currentStudentProfile.email;

    const requestBody = {
      idBranch: this.idBranch,
      email: emailEstudiante,
      idPaquete: this.selectedMembresiaId
    };

    const apiUrl = 'https://assignpackagetouser-rdotx3vmaq-uc.a.run.app';

    // Usamos HttpClient para consumir el servicio (asegúrate de tener HttpClient importado en tu componente)
    this.studentService.asignarMembresiaAPI(apiUrl, requestBody).subscribe({
      next: (response: any) => {
        this.isAssigningPackage = false;
        if (response && response.success) {
          this.showAsignarPaqueteSection = false;
          this.showSuccessPopup = true;
          // Opcional: recargar el detalle del alumno aquí si gustas
        } else {
          alert("Error al asignar membresía: " + (response?.error || 'Error desconocido'));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAssigningPackage = false;
        console.error("Error HTTP al asignar membresía:", err);
        alert("Ocurrió un error al conectar con el servidor.");
        this.cdr.detectChanges();
      }
    });
  }
}
