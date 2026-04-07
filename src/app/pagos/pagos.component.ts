import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule, Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp,ArrowLeftRight,ChevronDown } from 'lucide-angular';
import { Payment } from './pagos.model';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './pagos.component.html'
})
export class PagosComponent implements OnInit {
  // Iconos
  readonly icons = { Search, Bell, HelpCircle, Filter, Trash2, CreditCard, Banknote, Landmark, Plus, TrendingUp,ArrowLeftRight,
  ChevronDown       };

  paymentForm: FormGroup;
  allPayments: Payment[] = [];
  paginatedPayments: Payment[] = [];

  // Paginación
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  constructor(private fb: FormBuilder) {
    this.paymentForm = this.fb.group({
      alumna: ['', Validators.required],
      monto: [0, [Validators.required, Validators.min(1)]],
      metodo: ['Efectivo', Validators.required],
      receptor: ['Recepcionista (Turno M)', Validators.required],
      plan: ['Mensualidad (Ilimitada)', Validators.required]
    });
  }

  ngOnInit() {
    this.generateMockData();
    this.updatePagination();
  }

  generateMockData() {
    const names = ['Lucía Villareal', 'Mariana Garza', 'Sofía Martínez', 'Ana Paula Lozano', 'Carlos Ruiz'];
    for (let i = 1; i <= 30; i++) {
      this.allPayments.push({
        id: i,
        alumna: names[i % names.length],
        email: `${names[i % names.length].replace(' ', '.').toLowerCase()}@email.com`,
        monto: 850 + (i * 10),
        plan: i % 2 === 0 ? 'MENSUALIDAD' : 'PAQUETE DE CLASES',
        metodo: i % 3 === 0 ? 'Transferencia' : (i % 2 === 0 ? 'Tarjeta' : 'Efectivo'),
        receptor: 'ADMINISTRADOR',
        fecha: new Date()
      });
    }
    this.allPayments.reverse(); // Los más nuevos primero
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.allPayments.length / this.pageSize);
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedPayments = this.allPayments.slice(start, start + this.pageSize);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  savePayment() {
    if (this.paymentForm.valid) {
      const newPayment: Payment = {
        id: this.allPayments.length + 1,
        ...this.paymentForm.value,
        email: 'nueva.alumna@email.com',
        fecha: new Date()
      };

      this.allPayments.unshift(newPayment); // Agregar al inicio
      this.paymentForm.reset({
        metodo: 'Efectivo',
        receptor: 'Recepcionista (Turno M)',
        plan: 'Mensualidad (Ilimitada)',
        monto: 0
      });
      this.currentPage = 1; // Volver a la página 1 para ver el nuevo registro
      this.updatePagination();
    }
  }
}
