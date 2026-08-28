import { Component, signal, Input, Output,OnInit, OnDestroy,ChangeDetectorRef,EventEmitter ,ViewChild, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { updateDoc,collection, doc, getDoc,getDocs, onSnapshot, Unsubscribe, getFirestore,query,orderBy,limit,documentId } from 'firebase/firestore';
import { Student } from './alumna.model';
import * as CryptoJS from 'crypto-js';
import * as QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
  AlertCircle,
  Check, Download
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

  // Datos del formulario de la responsiva
  formData = {
    folio: 'BST-2026-001',
    dia: new Date().getDate().toString().padStart(2, '0'),
    mes: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    anio: new Date().getFullYear().toString(),
    nombreCompleto: '',
    fechaNacimiento: '',
    edad: '',
    telefono: '',
    correo: '',
    contactoEmergencia: '',
    telefonoEmergencia: '',
    // Información de salud
    condiciones: {
      lesionMuscular: false,
      dolorEspalda: false,
      problemasRodilla: false,
      problemasCardiovasculares: false,
      hipertension: false,
      diabetes: false,
      asma: false,
      cirugiaReciente: false,
      embarazo: false,
      posparto: false,
      otraCondicion: false,
      ninguna: false
    },
    descripcionCondicion: '',
    evitarActividadFisica: '', // 'si' | 'no'
    tomaMedicamento: '', // 'si' | 'no'
    cualMedicamento: '',
    menoresAcompanantes: '', // 'no' | 'si'
    nombreFirma: '',
    fechaFirma: new Date().toLocaleDateString()
  };
  showSignModal = false;
  signatureImage: string | null = null;
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
 @ViewChild('qrCardContainer') qrCardContainer!: ElementRef;
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
// ... dentro de tu clase component
showQrModal = false;
qrCodeDataUrl = '';
@Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
// Llave de 16 bytes exacta a la de Kotlin
private readonly AES_KEY = CryptoJS.enc.Utf8.parse('1234567890123456');
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
readonly icons = { X, Check, Download, Edit3, Trash2 };
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

// Asegurar que el pad de firma abra y actualice vistas
openSignPad() {
  this.showSignModal = true;
  this.cdr.detectChanges();
  setTimeout(() => {
    if (this.signatureCanvas && this.signatureCanvas.nativeElement) {
      const canvas = this.signatureCanvas.nativeElement;
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = 200;
      this.ctx = canvas.getContext('2d')!;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = '#000000';
    }
  }, 100);
}

  // Eventos de dibujo táctil / mouse en el Canvas
  startDrawing(event: MouseEvent | TouchEvent) {
    this.isDrawing = true;
    const pos = this.getPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    const pos = this.getPosition(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearCanvas() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.signatureCanvas.nativeElement.width, this.signatureCanvas.nativeElement.height);
  }

  saveSignature() {
    const canvas = this.signatureCanvas.nativeElement;
    this.signatureImage = canvas.toDataURL('image/png');
    this.showSignModal = false;
  }

  private getPosition(event: MouseEvent | TouchEvent) {
    const rect = this.signatureCanvas.nativeElement.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  // Descargar documento completo como PNG
  @ViewChild('documentoContainer') documentoContainer!: ElementRef;
async descargarComoPDF() {
  if (!this.signatureImage) {
    alert('Por favor, ingresa tu firma antes de descargar el documento.');
    return;
  }

  const element = this.documentoContainer.nativeElement;

  try {
    // 🌟 Truco: Guardamos el estilo original para restaurarlo después
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;

    // Forzamos al elemento a mostrar todo su contenido sin restricciones de altura para la captura
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    const options: any = {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 800,
      windowHeight: element.scrollHeight // Captura absolutamente todo hacia abajo
    };

    const canvas = await html2canvas(element, options);

    // Restauramos los estilos originales del contenedor en la vista
    element.style.maxHeight = originalMaxHeight;
    element.style.overflow = originalOverflow;

    const imgData = canvas.toDataURL('image/png');

    // Creamos el PDF en formato Letter vertical
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Insertamos la imagen completa en el PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Descargamos el archivo PDF completo
    pdf.save(`Carta_Responsiva_${this.formData.nombreCompleto || 'Alumno'}.pdf`);

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    alert('Hubo un error al generar el documento PDF.');
  }
}
cerrarModal() {
  this.isOpen = false;
  this.close.emit();
  this.cdr.detectChanges();
}
  // Método opcional para cuando el usuario termine de firmar y se guarde la URL con éxito
onFirmaGuardada(nuevaUrl: string) {
  if (this.currentStudentProfile) {
    this.currentStudentProfile.urlDocumentResponsiva = nuevaUrl;
  }
  this.isOpen = false;
  this.cdr.detectChanges();
}

encryptData(data: string): string {
  const encrypted = CryptoJS.AES.encrypt(data, this.AES_KEY, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString(); // CryptoJS ya lo convierte a Base64 por defecto
}

async abrirModalQr() {
  if (!this.currentStudentProfile) return;

  // 1. Construir la cadena tal como en Android: nipSocio/idSocio/email/phone
  const rawString = `${this.currentStudentProfile.nipSocio || ''}/${this.currentStudentProfile.idSocio || ''}/${this.currentStudentProfile.email || ''}/${this.currentStudentProfile.phone || ''}`;

  // 2. Encriptar con AES igual a Kotlin
  const encryptedString = this.encryptData(rawString);

  try {
    // 3. Generar la imagen QR en formato DataURL
    this.qrCodeDataUrl = await QRCode.toDataURL(encryptedString, {
      width: 250,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    this.showQrModal = true;
  } catch (err) {
    console.error('Error al generar el código QR', err);
  }
}
async descargarQrPng() {
  if (!this.qrCardContainer || !this.currentStudentProfile) return;

  try {
    // Forzamos el tipado como 'any' para evitar que TypeScript valide estrictamente las propiedades
    const options: any = {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    };

    const canvas = await html2canvas(this.qrCardContainer.nativeElement, options);

    const image = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = image;
    link.download = `CheckIn-${this.currentStudentProfile.fullName || 'Alumna'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al generar la imagen de la tarjeta QR:', error);
    alert('No se pudo descargar la imagen completa.');
  }
}

// 2. Función para compartir por WhatsApp usando el teléfono de la alumna
compartirWhatsApp() {
  if (!this.currentStudentProfile || !this.currentStudentProfile.phone) {
    alert('La alumna no cuenta con un número de teléfono registrado.');
    return;
  }

  // Limpiamos el teléfono (eliminamos espacios, guiones, paréntesis si los hubiera)
  const phoneClean = this.currentStudentProfile.phone.replace(/\D/g, '');

  // Mensaje personalizado
  const mensaje = encodeURIComponent(
    `¡Hola ${this.currentStudentProfile.fullName}! Aquí tienes tu código QR personal para el check-in rápido en BEAST TESISTÁN. Tu NIP de acceso es: ${this.currentStudentProfile.nipSocio}`
  );

  // URL universal de WhatsApp
  const urlWhatsApp = `https://wa.me/${phoneClean}?text=${mensaje}`;

  // Abrir en una pestaña nueva
  window.open(urlWhatsApp, '_blank');
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
// Método para abrir el panel/modal de la firma en pantalla
abrirModalFirmaResponsiva() {
  this.isOpen = true;
  this.cdr.detectChanges();
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
    // 1. Validar que exista un correo válido para ubicar el documento en 'users'
    const emailEstudiante = this.selectedStudent.email ? this.selectedStudent.email.trim() : '';

    if (!emailEstudiante) {
      alert("El correo electrónico es obligatorio para actualizar el perfil.");
      return;
    }

    const db = getFirestore();
    const userDocRef = doc(db, 'users', emailEstudiante);

    // 2. Definir estrictamente solo los campos que se van a actualizar
    const datosActualizados = {
      fullName: this.selectedStudent.name || this.selectedStudent.fullName,
      phone: this.selectedStudent.phone
    };

    // 3. Actualizar en Firestore usando updateDoc
    updateDoc(userDocRef, datosActualizados)
      .then(() => {
        console.log("Perfil actualizado en Firestore con éxito.");

        // Actualizamos también la lista local reactiva de alumnos si es necesario
        this.students.update(list =>
          list.map(s => s.email === emailEstudiante ? { ...s, fullName: datosActualizados.fullName, phone: datosActualizados.phone } : s)
        );

        this.showModal = false;
        this.cdr.detectChanges();
        alert("¡Datos actualizados correctamente!");
      })
      .catch((error) => {
        console.error("Error al actualizar en Firestore:", error);
        alert("Hubo un error al actualizar los datos en el servidor.");
      });

  } else {
    // Lógica para registrar una nueva alumna (la que ya tenías)
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
          this.cdr.detectChanges();
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
