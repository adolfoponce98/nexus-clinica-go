import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  LucideAngularModule, Calendar, Clock, User, Phone, Search,
  CheckCircle2, X, Scissors, Sparkles, ChevronRight, ChevronLeft, ArrowRight
} from 'lucide-angular';

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number; // en minutos
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

@Component({
  selector: 'app-nueva-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: 'nueva-cita-modal.component.html'
})
export class NuevaCitaModalComponent {
  readonly icons = {
    Calendar, Clock, User, Phone, Search,
    CheckCircle2, X, Scissors, Sparkles, ChevronRight, ChevronLeft, ArrowRight
  };

  @Output() close = new EventEmitter<void>();
  @Output() submitCita = new EventEmitter<any>();

  appointmentForm: FormGroup;

  // Clientes recientes
  recentClients = ['Mariana Gómez', 'Lucas Benítez', 'Carla Varela'];

  // Países para teléfono
  countries = [
    { code: '+52', name: 'México', flag: '🇲🇽' },
    { code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+34', name: 'España', flag: '🇪🇸' },
    { code: '+54', name: 'Argentina', flag: '🇦🇷' }
  ];
  selectedCountryCode = '+52';

  // Catálogo de Servicios con categoría
  services: ServiceItem[] = [
    { id: '1', name: 'Corte + Tratamiento Nutritivo', category: 'Cabello / Estilismo', price: 18500, duration: 45 },
    { id: '2', name: 'Perfilado de Barba + Facial Express', category: 'Barbería', price: 19000, duration: 60 },
    { id: '3', name: 'Manicurie Semipermanente + Spa', category: 'Uñas', price: 14000, duration: 50 },
    { id: '4', name: 'Masaje Relajante Descontracturante', category: 'Spas / Masajes', price: 25000, duration: 60 }
  ];
  serviceSearchTerm = signal('');
  showServiceDropdown = false;
  selectedService: ServiceItem | null = null;

  // Personal / Empleados
  staffList: StaffMember[] = [
    { id: 'any', name: 'Cualquier profesional disponible', role: 'General' },
    { id: '1', name: 'Marcela Silva', role: 'Estilista Senior' },
    { id: '2', name: 'Carlos Mendoza', role: 'Barbero Profesional' },
    { id: '3', name: 'Ana Sofía R.', role: 'Especialista en Uñas' }
  ];

  // Carrusel de Fechas (Presente al futuro)
  availableDates: { label: string; subLabel: string; dateStr: string; fullDate: Date }[] = [];
  selectedDateIndex = 0;

  // Horarios disponibles según el día seleccionado
  timeSlots = ['09:00 hrs', '10:00 hrs', '11:15 hrs', '13:00 hrs', '14:30 hrs', '16:00 hrs', '17:30 hrs', '19:00 hrs'];
  selectedTimeSlot = signal<string | null>('14:30 hrs');
datePage = 0; // Índice de la página actual de fechas
daysPerPage = 5;

// Métodos para navegar con flechas
nextDatePage() {
  if ((this.datePage + 1) * this.daysPerPage < this.availableDates.length) {
    this.datePage++;
  }
}

prevDatePage() {
  if (this.datePage > 0) {
    this.datePage--;
  }
}

// Método getter para obtener solo los 5 días de la página actual
get displayedDates() {
  const start = this.datePage * this.daysPerPage;
  return this.availableDates.slice(start, start + this.daysPerPage);
}
  constructor(private fb: FormBuilder) {
    this.appointmentForm = this.fb.group({
      clientName: ['', Validators.required],
      clientPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      serviceId: ['', Validators.required],
      staffId: ['any', Validators.required]
    });

    this.generateFutureDates();
  }

  // Generar fechas desde hoy hacia el futuro (14 días adelante)
  generateFutureDates() {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);

     let label = i === 0 ? 'HOY' : i === 1 ? 'MAÑANA' : d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
      let subLabel = `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' })}`;

      dates.push({
        label,
        subLabel,
        dateStr: d.toISOString().split('T')[0],
        fullDate: d
      });
    }
    this.availableDates = dates;
  }

  selectClient(name: string) {
    this.appointmentForm.patchValue({ clientName: name });
  }

  filterServices() {
    const term = this.serviceSearchTerm().toLowerCase();
    if (!term) return this.services;
    return this.services.filter(s =>
      s.name.toLowerCase().includes(term) || s.category.toLowerCase().includes(term)
    );
  }

  selectService(service: ServiceItem) {
    this.selectedService = service;
    this.appointmentForm.patchValue({ serviceId: service.id });
    this.showServiceDropdown = false;
    this.serviceSearchTerm.set('');
  }

  selectDate(index: number) {
    this.selectedDateIndex = index;
  }

  selectTime(slot: string) {
    this.selectedTimeSlot.set(slot);
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    if (this.appointmentForm.invalid || !this.selectedService) {
      alert('Por favor complete todos los campos obligatorios correctamente (Teléfono exactamente de 10 dígitos).');
      return;
    }

    const payload = {
      clientName: this.appointmentForm.value.clientName,
      phone: `${this.selectedCountryCode} ${this.appointmentForm.value.clientPhone}`,
      service: this.selectedService,
      staffId: this.appointmentForm.value.staffId,
      date: this.availableDates[this.selectedDateIndex].dateStr,
      time: this.selectedTimeSlot()
    };

    this.submitCita.emit(payload);
    this.onClose();
  }
}
