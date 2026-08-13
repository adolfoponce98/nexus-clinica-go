import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp, ArrowLeftRight, ChevronDown } from 'lucide-angular';
import { Payment } from './pagos.model';
import { PagosService, RegistrarPagoRequest } from './pagos.service';
import { collection, onSnapshot, Unsubscribe, getFirestore, query } from 'firebase/firestore';

interface StudentSuggestion {
  fullName: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  providers: [PagosService],
  templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit, OnDestroy {
  readonly icons = { Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp, ArrowLeftRight, ChevronDown };

  paymentForm: FormGroup;
  allPayments: Payment[] = [];
  paginatedPayments: Payment[] = [];

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Sucursal actual e historial de suscriptores para autocompletar
  idBranch: string = 'BEAST-TESISTAN';
  allStudents: StudentSuggestion[] = [];
  filteredStudents: StudentSuggestion[] = [];
  showSuggestions = false;
  selectedStudentEmail = '';

  private unsubPayments?: Unsubscribe;
  private unsubStudents?: Unsubscribe;

  constructor(
    private fb: FormBuilder, 
    private pagosService: PagosService,
    private cdr: ChangeDetectorRef // <--- 1. Inyectamos ChangeDetectorRef aquí
  ) {
    this.paymentForm = this.fb.group({
      alumna: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      metodo: ['Efectivo', Validators.required],
      receptor: ['Recepcionista (Turno Mañana)', Validators.required],
      plan: ['Mensualidad (Ilimitada)', Validators.required]
    });
  }

  ngOnInit() {
    this.loadStudentsForSearch();
    this.loadCurrentMonthPayments();

    // Escuchar cambios en el input de búsqueda de alumna
    this.paymentForm.get('alumna')?.valueChanges.subscribe(value => {
      this.filterStudents(value);
    });
  }

  ngOnDestroy() {
    if (this.unsubPayments) this.unsubPayments();
    if (this.unsubStudents) this.unsubStudents();
  }

  // 1. Cargar alumnas de Firestore para el buscador predictivo
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
      this.cdr.detectChanges(); // <--- Actualizamos vista también aquí por si llegan después
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

  // 2. Cargar pagos del mes en curso desde la ruta anidada de Firestore
  loadCurrentMonthPayments() {
    const db = getFirestore();
    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const monthIndex = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${yearStr}-${monthIndex}`; // Ej: "2026-08"

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

      // Ordenar manualmente del más reciente al más antiguo
      this.allPayments.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      
      this.updatePagination();

      // <--- 2. Forzamos a Angular a renderizar los datos inmediatamente en pantalla
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

  // 3. Guardar el pago consumiendo el servicio de Cloud Functions
  savePayment() {
    if (this.paymentForm.valid) {
      const formVal = this.paymentForm.value;

      const payload: RegistrarPagoRequest = {
        branchId: this.idBranch,
        monto: Number(formVal.monto),
        emailAlumno: this.selectedStudentEmail || 'cliente@email.com',
        emailRecepcion: formVal.receptor,
        metodoPago: formVal.metodo,
        concepto: formVal.plan,
        conceptoPagoId: 'PLAN-' + Date.now()
      };

      this.pagosService.registrarPago(payload).subscribe({
        next: (response) => {
          if (response.success) {
            alert('¡Pago registrado con éxito!');
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