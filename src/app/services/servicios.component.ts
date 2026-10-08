import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  LucideAngularModule, Scissors, DollarSign, Clock, FileText, Calendar,
  Plus, CheckCircle2, MoreVertical, Flame, Sparkles, X, ArrowRight, ToggleLeft, ToggleRight
} from 'lucide-angular';

export interface ServiceModel {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  bufferTime: number;
  requireDeposit: boolean;
  depositAmount: number;
  description: string;
  activeDays: { [key: string]: boolean };
  aiAutoBooking: boolean;
  isActive: boolean;
  popular?: boolean;
  monthlyBookings: number;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: 'servicios.component.html'
})
export class ServiciosComponent {
  readonly icons = {
    Scissors, DollarSign, Clock, FileText, Calendar,
    Plus, CheckCircle2, MoreVertical, Flame, Sparkles, X, ArrowRight
  };

  serviceForm: FormGroup;
  editingServiceId: string | null = null;

  // Categorías disponibles
  categories = [
    'Hair & Styling',
    'Beard & Shave',
    'Nails & Hands',
    'Color & Therapy',
    'Facial & Spa'
  ];

  // Días de la semana para disponibilidad
  weekDays = [
    { key: 'Mon', label: 'M' },
    { key: 'Tue', label: 'T' },
    { key: 'Wed', label: 'W' },
    { key: 'Thu', label: 'T' },
    { key: 'Fri', label: 'F' },
    { key: 'Sat', label: 'S' },
    { key: 'Sun', label: 'S' }
  ];

  // Lista de servicios existentes (simulando los de la imagen de referencia)
  servicesList = signal<ServiceModel[]>([
    {
      id: '1',
      name: 'Corte de Autor + Brushing',
      category: 'Hair & Styling',
      price: 45.00,
      duration: 45,
      bufferTime: 10,
      requireDeposit: true,
      depositAmount: 15.00,
      description: 'Lavado premium con masaje capilar, corte estilizado y acabado profesional.',
      activeDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
      aiAutoBooking: true,
      isActive: true,
      popular: true,
      monthlyBookings: 38
    },
    {
      id: '2',
      name: 'Perfilado de Barba + Facial Express',
      category: 'Beard & Shave',
      price: 35.00,
      duration: 60,
      bufferTime: 10,
      requireDeposit: false,
      depositAmount: 0,
      description: 'Toalla caliente con aceites esenciales, delineado a navaja y tratamiento facial.',
      activeDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
      aiAutoBooking: true,
      isActive: true,
      popular: true,
      monthlyBookings: 29
    },
    {
      id: '3',
      name: 'Coloración Global + Tratamiento',
      category: 'Color & Therapy',
      price: 65.00,
      duration: 60,
      bufferTime: 15,
      requireDeposit: true,
      depositAmount: 20.00,
      description: 'Tinte libre de amoníaco con sellado de cutícula y nutrición profunda.',
      activeDays: { Mon: false, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
      aiAutoBooking: false,
      isActive: true,
      popular: false,
      monthlyBookings: 17
    }
  ]);

  constructor(private fb: FormBuilder) {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      category: ['Hair & Styling', Validators.required],
      price: [45.00, [Validators.required, Validators.min(0)]],
      duration: [45, [Validators.required, Validators.min(5)]],
      bufferTime: [10],
      requireDeposit: [false],
      depositAmount: [15.00],
      description: [''],
      aiAutoBooking: [true],
      isActive: [true],
      activeDays: this.fb.group({
        Mon: [true], Tue: [true], Wed: [true], Thu: [true], Fri: [true], Sat: [true], Sun: [false]
      })
    });
  }

  // Seleccionar duración rápida
  setDuration(mins: number) {
    this.serviceForm.patchValue({ duration: mins });
  }

  // Seleccionar buffer rápido
  setBuffer(mins: number) {
    this.serviceForm.patchValue({ bufferTime: mins });
  }

  // Seleccionar categoría
  selectCategory(cat: string) {
    this.serviceForm.patchValue({ category: cat });
  }

  // Cargar datos en el formulario al hacer clic en una tarjeta existente
  selectServiceToEdit(service: ServiceModel) {
    this.editingServiceId = service.id;
    this.serviceForm.patchValue({
      name: service.name,
      category: service.category,
      price: service.price,
      duration: service.duration,
      bufferTime: service.bufferTime,
      requireDeposit: service.requireDeposit,
      depositAmount: service.depositAmount,
      description: service.description,
      aiAutoBooking: service.aiAutoBooking,
      isActive: service.isActive,
      activeDays: { ...service.activeDays }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Resetear formulario para nuevo servicio
  resetForm() {
    this.editingServiceId = null;
    this.serviceForm.reset({
      category: 'Hair & Styling',
      price: 45.00,
      duration: 45,
      bufferTime: 10,
      requireDeposit: false,
      depositAmount: 15.00,
      aiAutoBooking: true,
      isActive: true,
      activeDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false }
    });
  }

  // Guardar o Publicar Servicio
  onSubmit() {
    if (this.serviceForm.invalid) {
      alert('Por favor complete los campos obligatorios del servicio.');
      return;
    }

    const formVal = this.serviceForm.value;

    if (this.editingServiceId) {
      // Actualizar existente
      this.servicesList.update(list =>
        list.map(s => s.id === this.editingServiceId ? { ...s, ...formVal } : s)
      );
      alert('Servicio actualizado con éxito.');
    } else {
      // Crear nuevo
      const newService: ServiceModel = {
        id: 'srv-' + Date.now(),
        ...formVal,
        monthlyBookings: 0
      };
      this.servicesList.update(list => [newService, ...list]);
      alert('Nuevo servicio publicado con éxito.');
    }

    this.resetForm();
  }

  // Toggle rápido de estatus desde la tarjeta
  toggleServiceStatus(service: ServiceModel, event: Event) {
    event.stopPropagation();
    this.servicesList.update(list =>
      list.map(s => s.id === service.id ? { ...s, isActive: !s.isActive } : s)
    );
  }
}
