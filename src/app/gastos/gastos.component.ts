import { PermissionDirective } from '../auth/permission.directive';
import { API_URLS } from '../config/api-urls';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  LucideAngularModule,
  Search,
  Bell,
  HelpCircle,
  Filter,
  Trash2,
  CreditCard,
  Banknote,
  Landmark,
  Plus,
  TrendingUp,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-angular';
import { collection, onSnapshot, Unsubscribe, getFirestore, query } from 'firebase/firestore';

export interface GastoModel {
  id?: string;
  concepto: string;
  monto: number;
  tipoGasto: number; // 0: insumo, 1: renta, etc. (o el mapeo que prefieras)
  correo: string;
  idBranch: string;
  fechaRegistro: string;
  fecha?: Date;
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [PermissionDirective, CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './gastos.component.html',
})
export class GastosComponent implements OnInit, OnDestroy {
  readonly icons = {
    Search,
    Bell,
    HelpCircle,
    Filter,
    Trash2,
    CreditCard,
    Banknote,
    Landmark,
    Plus,
    TrendingUp,
    ArrowLeftRight,
    ChevronDown,
  };

  private http = inject(HttpClient);
  private apiUrl = API_URLS.REGISTRARGASTO;

  gastoForm: FormGroup;
  allGastos: GastoModel[] = [];
  paginatedGastos: GastoModel[] = [];
  showSuccessDialog = signal<boolean>(false);
  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  idBranch: string = 'BEAST-TESISTAN';
  currentUserEmail: string = 'admin@beast.com'; // Puedes cambiarlo por el correo real de la sesión

  private unsubGastos?: Unsubscribe;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.gastoForm = this.fb.group({
      concepto: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      tipoGasto: [0, Validators.required], // Guardamos como número entero
    });
  }

  ngOnInit() {
    this.loadCurrentMonthGastos();
  }

  ngOnDestroy() {
    if (this.unsubGastos) this.unsubGastos();
  }

  // Cargar gastos del mes actual en tiempo real desde Firestore
  loadCurrentMonthGastos() {
    const db = getFirestore();
    const now = new Date();
    const yearStr = now.getFullYear().toString();
    const monthIndex = (now.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${yearStr}-${monthIndex}`; // Ej: "2026-08"

    const gastosRef = collection(
      db,
      'gastos',
      this.idBranch,
      'year',
      yearStr,
      'meses',
      monthKey,
      'gastos',
    );

    const q = query(gastosRef);

    this.unsubGastos = onSnapshot(
      q,
      (snapshot) => {
        this.allGastos = snapshot.docs.map((doc) => {
          const data = doc.data();
          const fechaDate = data['fechaRegistro'] ? new Date(data['fechaRegistro']) : new Date();

          return {
            id: doc.id,
            concepto: data['concepto'] || 'N/A',
            monto: data['monto'] || 0,
            tipoGasto: data['tipoGasto'] ?? 0,
            correo: data['correo'] || 'N/A',
            idBranch: data['idBranch'] || this.idBranch,
            fechaRegistro: data['fechaRegistro'] || '',
            fecha: fechaDate,
          };
        });

        // Ordenar del más reciente al más antiguo
        this.allGastos.sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0));

        this.updatePagination();
        this.cdr.detectChanges();
      },
      (error) => {
        console.error('Error al escuchar los gastos del mes:', error);
      },
    );
  }

  get totalGeneral(): number {
    return this.allGastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  }

  getTotalPorTipo(tipo: number): number {
    return this.allGastos
      .filter((g) => g.tipoGasto === tipo)
      .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  }

  // Traductor visual para el tipo de gasto numérico
  getTipoGastoText(tipo: number): string {
    switch (tipo) {
      case 0:
        return 'Insumo';
      case 1:
        return 'Renta';
      case 2:
        return 'Reembolsable';
      case 3:
        return 'Pago Empleado';
      default:
        return 'General';
    }
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.allGastos.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedGastos = this.allGastos.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  // Modifica la respuesta dentro de saveGasto()
  saveGasto() {
    if (this.gastoForm.valid) {
      const formVal = this.gastoForm.value;

      const payload = {
        monto: Number(formVal.monto),
        concepto: formVal.concepto,
        tipoGasto: Number(formVal.tipoGasto),
        correo: this.currentUserEmail,
        idBranch: this.idBranch,
      };

      this.http
        .post<{ success: boolean; message?: string; error?: string }>(this.apiUrl, payload)
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Mostramos el diálogo en lugar del alert tradicional
              this.showSuccessDialog.set(true);

              this.gastoForm.reset({
                monto: 0,
                tipoGasto: 0,
              });
            } else {
              alert('Error al registrar gasto: ' + response.error);
            }
          },
          error: (err) => {
            console.error('Error HTTP al registrar gasto', err);
            alert('Error al conectar con el servidor de gastos.');
          },
        });
    }
  }
}
