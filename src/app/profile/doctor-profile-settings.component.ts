import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, User, ShieldCheck, Award, Stethoscope,
  Briefcase, Image as ImageIcon, Share2, CheckCircle2, Building2, Plus, Trash2,
  Facebook, Instagram, Linkedin, Twitter, Youtube, Video
} from 'lucide-angular';

interface Consultorio {
  id: number;
  name: string;
  city: string;
  address: string;
  postalCode: string;
  additionalInfo: string;
  website: string;
  phoneMain: string;
  phoneSecondary: string;
  accessibility: {
    wheelchair: boolean;
    pregnantOrKids: boolean;
    visualDisability: boolean;
    hearingDisability: boolean;
  };
  directions: string;
  paymentMethods: {
    creditCard: boolean;
    cash: boolean;
    paypal: boolean;
    debitCard: boolean;
    transfer: boolean;
  };
  services: Array<{ name: string; price: number }>;
  insurancePolicy: string; // 'privateOnly' | 'both'
  patientTypes: {
    adults: boolean;
    children: boolean;
  };
}

@Component({
  selector: 'app-doctor-profile-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './doctor-profile-settings.component.html'
})
export class DoctorProfileSettingsComponent {
  readonly icons = {
    User, ShieldCheck, Award, Stethoscope,
    Briefcase, ImageIcon, Share2, CheckCircle2, Building2, Plus, Trash2,
    Facebook, Instagram, Linkedin, Twitter, Youtube, Video
  };

  // Pestañas de configuración (Incluye la nueva de Consultorios)
  profileTabs = [
    { id: 'basic', name: 'Información Básica', icon: User },
    { id: 'legal', name: 'Datos y Especialidades', icon: ShieldCheck },
    { id: 'clinics', name: 'Consultorios', icon: Building2 },
    { id: 'experience', name: 'Experiencia y Trayectoria', icon: Briefcase },
    { id: 'media', name: 'Fotos y Videos', icon: ImageIcon },
    { id: 'social', name: 'Redes Sociales', icon: Share2 }
  ];

  activeTab = signal('basic');

  // Listado de consultorios del doctor
  consultorios = signal<Consultorio[]>([
    {
      id: 1,
      name: 'Clínica Integral Tesistán',
      city: 'Zapopan, Jalisco',
      address: 'Av. Juan Gil Preciado #1500',
      postalCode: '45200',
      additionalInfo: 'Consultorio 402, Torre Médica II',
      website: 'https://clinicatesistan.com',
      phoneMain: '+52 33 1122 3344',
      phoneSecondary: '+52 33 5566 7788',
      accessibility: { wheelchair: true, pregnantOrKids: true, visualDisability: false, hearingDisability: true },
      directions: 'Frente a la estación de tranvía, estacionamiento subterráneo disponible.',
      paymentMethods: { creditCard: true, cash: true, paypal: false, debitCard: true, transfer: true },
      services: [
        { name: 'Consulta Primera Vez', price: 800 },
        { name: 'Sesión de Acupuntura', price: 600 }
      ],
      insurancePolicy: 'both',
      patientTypes: { adults: true, children: true }
    }
  ]);

  setActiveTab(tabId: string) {
    this.activeTab.set(tabId);
  }

  addConsultorio() {
    const nuevo: Consultorio = {
      id: Date.now(),
      name: 'Nuevo Consultorio',
      city: '',
      address: '',
      postalCode: '',
      additionalInfo: '',
      website: '',
      phoneMain: '',
      phoneSecondary: '',
      accessibility: { wheelchair: false, pregnantOrKids: false, visualDisability: false, hearingDisability: false },
      directions: '',
      paymentMethods: { creditCard: false, cash: true, paypal: false, debitCard: false, transfer: false },
      services: [{ name: 'Consulta General', price: 500 }],
      insurancePolicy: 'privateOnly',
      patientTypes: { adults: true, children: false }
    };
    this.consultorios.update(list => [...list, nuevo]);
  }

  removeConsultorio(id: number) {
    this.consultorios.update(list => list.filter(c => c.id !== id));
  }

  addService(consultorio: Consultorio) {
    consultorio.services.push({ name: '', price: 0 });
  }

  removeService(consultorio: Consultorio, index: number) {
    consultorio.services.splice(index, 1);
  }

  saveProfile() {
    alert('¡Configuración de perfil y consultorios guardada con éxito!');
  }
}
