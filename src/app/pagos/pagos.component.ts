import { Component, OnInit, OnDestroy, ChangeDetectorRef,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp, ArrowLeftRight, ChevronDown, Printer, FileText, Send, X, RefreshCw } from 'lucide-angular';
import { Payment } from './pagos.model';
import { PagosService, RegistrarPagoRequest } from './pagos.service';
import { collection, onSnapshot, Unsubscribe, getFirestore, query } from 'firebase/firestore';
import { PaqueteMemberShipModel } from '../planes/planes.model'; // Asegura esta ruta
import { AuthService } from '../auth/auth.service';

interface StudentSuggestion {
  fullName: string;
  email: string;
  phone: string;
}

// permisos.model.ts
export const PERMISSION_STRUCTURE = {
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

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  providers: [PagosService],
  templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit, OnDestroy {
  readonly icons = { Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp, ArrowLeftRight, ChevronDown, Printer, FileText, Send, X, RefreshCw };
  private authService = inject(AuthService);
  paymentForm: FormGroup;
  allPayments: Payment[] = [];
  paginatedPayments: Payment[] = [];
  availablePlans: PaqueteMemberShipModel[] = [];
  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  userData: any = null;
  isManualConcept = false;
  isClasesExtra = false;
  // Sucursal actual e historial de suscriptores
  idBranch: string = 'BEAST-TESISTAN';
  allStudents: StudentSuggestion[] = [];
  filteredStudents: StudentSuggestion[] = [];
  showSuggestions = false;
  selectedStudentEmail = '';

  // --- ESTADOS DE TICKET Y BLUETOOTH ---
  showTicketModal = false;
  selectedTicket: Payment | null = null;
  isPrinting = false;

  private unsubPayments?: Unsubscribe;
  private unsubStudents?: Unsubscribe;

  constructor(
    private fb: FormBuilder,
    private pagosService: PagosService,
    private cdr: ChangeDetectorRef
  ) {
    this.paymentForm = this.fb.group({
      alumna: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      numeroClases: [0, [, Validators.min(1)]],
      metodo: ['Efectivo', Validators.required],
      plan: ['Mensualidad (Ilimitada)', Validators.required]
    });
  }

  ngOnInit() {
    this.userData = this.authService.getSession(); // Aseguramos tener el user data
    this.loadStudentsForSearch();
    this.loadCurrentMonthPayments();
    this.loadAvailablePlans(); // Nueva función para llenar el combo
    this.paymentForm.get('alumna')?.valueChanges.subscribe(value => {
      this.filterStudents(value);
    });
    this.paymentForm.get('plan')?.valueChanges.subscribe(planName => {
    this.handlePlanChange(planName);
  });
  }

  handlePlanChange(planName: string) {
  const selectedPlan = this.availablePlans.find(p => p.name === planName);

  if (selectedPlan) {
    // Es un plan del catálogo: Precargamos precio y bloqueamos edición (opcional)
    this.paymentForm.patchValue({ monto: selectedPlan.precioRegular }, { emitEvent: false });
    this.isManualConcept = false;
  } else if (['Pago extraordinario', 'PREPAGO', 'ABONO', 'OTRO','CLASES ADICIONALES'].includes(planName)) {
    this.paymentForm.patchValue({ monto: 0 }, { emitEvent: false });
    this.isManualConcept = true;
     if (['CLASES ADICIONALES'].includes(planName)){
        this.isClasesExtra =true
     }else{
        this.isClasesExtra =false
     }
  }
}

// Calcula el total general del mes
get totalGeneralMes(): number {
  return this.allPayments.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
}

// Calcula los totales agrupados por concepto (plan)
get desglosadoPorConcepto(): { nombre: string, total: number }[] {
  const agrupado: { [key: string]: number } = {};

  this.allPayments.forEach(p => {
    const concepto = p.plan || 'Otros';
    agrupado[concepto] = (agrupado[concepto] || 0) + Number(p.monto);
  });

  return Object.keys(agrupado).map(key => ({
    nombre: key,
    total: agrupado[key]
  }));
}

  ngOnDestroy() {
    if (this.unsubPayments) this.unsubPayments();
    if (this.unsubStudents) this.unsubStudents();
  }

  // 1. Cargar paquetes de la sucursal
loadAvailablePlans() {
  const db = getFirestore();
  const plansRef = collection(db, `membresias/${this.idBranch}/membrecias`);

  onSnapshot(plansRef, (snapshot) => {
    this.availablePlans = snapshot.docs.map(doc => ({
      ...doc.data() as PaqueteMemberShipModel,
      idPaquete: doc.id
    }));
    this.cdr.detectChanges();
  });
}

  loadStudentsForSearch() {
    const db = getFirestore();
    const studentsRef = collection(db, `suscriptionsBranches/${this.idBranch}/suscriptions`);

    this.unsubStudents = onSnapshot(studentsRef, (snapshot) => {
      this.allStudents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          fullName: data['fullName'] || '',
          email: data['email'] || '',
          phone: data['phone'] || ''
        };
      });
      this.cdr.detectChanges();
    }, error => {
      console.error('Error al cargar alumnas:', error);
    });
  }

  filterStudents(search: string) {
    if (!search || search.trim() === '') {
      this.filteredStudents = [];
      this.showSuggestions = false;
      return;
    }
    const filter = search.toLowerCase();
    this.filteredStudents = this.allStudents.filter(s =>
      s.fullName.toLowerCase().includes(filter) || s.phone.includes(filter)
    );
    this.showSuggestions = this.filteredStudents.length > 0;
  }

  selectStudent(student: StudentSuggestion) {
    this.selectedStudentEmail = student.email;
    this.paymentForm.patchValue({ alumna: student.fullName });
    this.showSuggestions = false;
  }

  loadCurrentMonthPayments() {
    const db = getFirestore();
    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const monthIndex = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${yearStr}-${monthIndex}`;

    const paymentsRef = collection(
      db,
      'pagos',
      this.idBranch,
      'year',
      yearStr,
      'meses',
      monthKey,
      'pagos'
    );

    const q = query(paymentsRef);

    this.unsubPayments = onSnapshot(q, (snapshot) => {
      this.allPayments = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        const fechaDate = data['fechaRegistro'] ? new Date(data['fechaRegistro']) : new Date();

        return {
          id: index + 1,
          alumna: this.getNameByEmail(data['emailAlumno']),
          email: data['emailAlumno'] || 'N/A',
          monto: data['monto'] || 0,
          plan: data['concepto'] || 'N/A',
          metodo: data['metodoPago'] || 'N/A',
          receptor: data['emailRecepcion'] || 'N/A',
          fecha: fechaDate
        };
      });

      this.allPayments.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      this.updatePagination();
      this.cdr.detectChanges();
    }, error => {
      console.error('Error al consultar pagos del mes:', error);
    });
  }

  getNameByEmail(email: string): string {
    const student = this.allStudents.find(s => s.email === email);
    return student ? student.fullName : email;
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.allPayments.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedPayments = this.allPayments.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Abrir modal de ticket desde la tabla
  openTicket(payment: Payment) {
    this.selectedTicket = payment;
    this.showTicketModal = true;
  }

  closeTicket() {
    this.showTicketModal = false;
    this.selectedTicket = null;
  }

  // Enviar ticket por WhatsApp o Correo
  enviarTicketExterno() {
    if (!this.selectedTicket) return;
    const mensaje = `*COMPROBANTE DE PAGO - BEAST*\n\nAlumna: ${this.selectedTicket.alumna}\nConcepto: ${this.selectedTicket.plan}\nMonto: $${this.selectedTicket.monto} MXN\nMétodo: ${this.selectedTicket.metodo}\nFecha: ${this.selectedTicket.fecha.toLocaleString()}\n\n¡Gracias por tu pago!`;

    // Abrir WhatsApp con el texto prediseñado
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

imprimirTicket() {
  if (!this.selectedTicket) return;

  try {
    this.isPrinting = true;
    this.cdr.detectChanges();

    // 1. Crear una ventana o pestaña invisible temporal
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes (pop-ups) para poder imprimir.');
      this.isPrinting = false;
      return;
    }

    // 2. Construir el HTML con la tipografía estándar de fábrica (Monospace a 13px, sin negritas)
    const ticketHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Pago</title>
          <style>
            @page {
              size: 58mm auto; /* Cambia a 80mm si tu impresora es de rollos grandes */
              margin: 0mm;
            }
            body {
              margin: 0;
              padding: 2mm;
              /* 'monospace' por defecto mapea directo a la fuente nativa de la impresora térmica */
              font-family: monospace, 'Courier New', Courier;
              font-size: 13px; /* El tamaño estándar exacto de los tickets de prueba */
              font-weight: normal; /* Grosor normal de fábrica, sin negritas pesadas */
              line-height: 1.2;
              color: black;
              background: white;
              width: 54mm;

              /* Evitar alteraciones de color o difuminados grises */
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .center { text-align: center; }
            .divider { text-align: center; margin: 4px 0; letter-spacing: -1px; }
            .uppercase { text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="center" style="font-size: 16px; margin-bottom: 2px;">BEAST FITNESS STUDIO</div>
          <div class="center" style="font-size: 12px; margin-bottom: 6px;">SUCURSAL: ${this.idBranch}</div>

          <div class="divider">=========================</div>

          <div style="font-size: 13px;">ALUMNA:${this.selectedTicket.alumna}</div>
          <div style="font-size: 13px;">CORREO: ${this.selectedTicket.email}</div>
          <div style="font-size: 13px;">CONCEPTO: ${this.selectedTicket.plan}</div>
          <div style="font-size: 13px;">MÉTODO: ${this.selectedTicket.metodo}</div>
          <div style="font-size: 13px;">RECIBIÓ: ${this.selectedTicket.receptor}</div>
          <div style="font-size: 13px; margin-bottom: 6px;">FECHA: ${this.selectedTicket.fecha.toLocaleString()}</div>

          <div class="divider">=========================</div>

          <div class="center" style="font-size: 16px; margin: 6px 0;">
            TOTAL: $${Number(this.selectedTicket.monto).toFixed(2)} MXN
          </div>

          <div class="divider">=========================</div>

          <div class="center" style="font-size: 13px; margin-top: 8px;">¡GRACIAS POR TU PREFERENCIA!</div>
          <div class="center" style="font-size: 12px; margin-top: 2px;">COMPROBANTE DE PAGO VÁLIDO</div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(ticketHtml);
    printWindow.document.close();

    this.isPrinting = false;
    this.cdr.detectChanges();
  } catch (error) {
    console.error('Error al imprimir:', error);
    this.isPrinting = false;
    this.cdr.detectChanges();
    alert('No se pudo completar la impresión.');
  }
}
  savePayment() {
    if (this.paymentForm.valid) {
      const formVal = this.paymentForm.value;
      const alumnoNombre = formVal.alumna;
      const montoVal = Number(formVal.monto);
      const clasesAdicionales = Number(formVal.numeroClases);
      const metodoVal = formVal.metodo;
      const planVal = formVal.plan;
      const nombreUsuario = this.userData?.fullName || 'Admin';
      const emailUsuario = this.userData?.email || 'sistema@beast.com';
      const receptorConcatenado = `${nombreUsuario} (${emailUsuario})`;
      const payload: RegistrarPagoRequest = {
        branchId: this.idBranch,
        monto: montoVal,
        clasesAdicionales:clasesAdicionales,
        emailAlumno: this.selectedStudentEmail || 'cliente@email.com',
        emailRecepcion: receptorConcatenado, // <--- Aquí se envía la concatenación
        metodoPago: metodoVal,
        concepto: planVal,
        conceptoPagoId: 'PLAN-' + Date.now()
      };

      this.pagosService.registrarPago(payload).subscribe({
        next: (response) => {
          if (response.success) {
            // Creamos el objeto del ticket recién pagado para mostrarlo inmediatamente
            this.selectedTicket = {
              id: Date.now(),
              alumna: alumnoNombre,
              email: this.selectedStudentEmail || 'cliente@email.com',
              monto: montoVal,
              plan: planVal,
              metodo: metodoVal,
              receptor: formVal.receptor,
              fecha: new Date()
            };
            this.showTicketModal = true; // Mostramos el diálogo del ticket

            this.paymentForm.reset({
              metodo: 'Efectivo',
              receptor: 'Recepcionista (Turno Mañana)',
              plan: 'Mensualidad (Ilimitada)',
              monto: 0
            });
            this.selectedStudentEmail = '';
          } else {
            alert('Error al registrar pago: ' + response.error);
          }
        },
        error: (err) => {
          console.error('Error HTTP al registrar pago', err);
          alert('Error al conectar con el servidor de pagos.');
        }
      });
    }
  }
}
