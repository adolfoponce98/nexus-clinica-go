import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  X,
  Scissors,
  Sparkles,
  Copy,
  DollarSign,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  Star,
} from 'lucide-angular';

@Component({
  selector: 'app-detalle-cita-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'detalle-cita-modal.component.html',
})
export class DetalleCitaModalComponent {
  readonly icons = {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    MessageSquare,
    CheckCircle2,
    X,
    Scissors,
    Sparkles,
    Copy,
    DollarSign,
    FileText,
    Activity,
    ArrowRight,
    ShieldCheck,
    Star,
  };

  @Input() citaData: any = {
    id: '#CIT-8924',
    clientName: 'Sofía Valenzuela Morales',
    clientPhone: '+34 654 892 183',
    clientEmail: 'sofia.valenzuela@gmail.com',
    clientHistoryCount: 8,
    clientRating: 5.0,
    isVip: true,
    status: 'Confirmada por WhatsApp',
    dateText: 'Jueves, 24 de Octubre de 2024',
    timeText: '15:30 – 16:45',
    durationMinutes: 75,
    serviceName: 'Balayage Premium + Hidratación & Brushing',
    category: 'Coloración & Estilismo Capilar',
    staffName: 'Dra. Marcela Silva',
    staffRole: 'Estilista Master',
    location: 'consultorio general',
    totalPrice: 68000,
    depositPaid: 20000,
    pendingBalance: 48000,
    aiSummary:
      'El cliente completó los 3 pasos de reserva automáticamente en menos de 90 segundos. Se programó el recordatorio para 2 horas antes de la cita.',
  };

  @Output() close = new EventEmitter<void>();
  @Output() actionTriggered = new EventEmitter<string>();

  // Pestaña activa del modal
  activeTab = signal<'resumen' | 'whatsapp' | 'notas'>('resumen');

  setActiveTab(tab: 'resumen' | 'whatsapp' | 'notas') {
    this.activeTab.set(tab);
  }

  copyPhone() {
    navigator.clipboard.writeText(this.citaData.clientPhone);
    alert('Teléfono copiado al portapapeles');
  }

  onClose() {
    this.close.emit();
  }

  triggerAction(action: string) {
    this.actionTriggered.emit(action);
    this.onClose();
  }
}
