import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Building2, Plus, Trash2, Search,
  ArrowLeft, Eye, Edit3, MapPin, Users, Stethoscope, Save, Loader2
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';

interface Consultorio {
  id: number | string;
  idConsultorio?: string;
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
  insurancePolicy: string;
  patientTypes: {
    adults: boolean;
    children: boolean;
  };
  totalPatients: number;
  totalDoctors: number;
}

@Component({
  selector: 'app-clinics-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './clinics-tab.component.html'
})
export class ClinicsComponent implements OnInit {
  private authService = inject(AuthService);

  readonly icons = {
    Building2, Plus, Trash2, Search, ArrowLeft,
    Eye, Edit3, MapPin, Users, Stethoscope, Save, Loader2
  };

  // 🔐 URLs y Credenciales de las Cloud Functions
  private readonly SAVE_URL = 'https://saveorupdateconsultorio-o7vmreizjq-uc.a.run.app';
  private readonly GET_URL = 'https://getdoctorsoffice-o7vmreizjq-uc.a.run.app';
  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';

  searchQuery = '';
  selectedConsultorio = signal<Consultorio | null>(null);
  isEditingMode = false;
  activeIdx = 0;
  isLoading = signal<boolean>(true);

  consultorios = signal<Consultorio[]>([]);

  filteredConsultorios = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.consultorios().filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.cargarConsultorios();
  }

  // 🚀 MÉTODO PARA CARGAR LOS CONSULTORIOS DESDE LA CLOUD FUNCTION
  async cargarConsultorios() {
    try {
      this.isLoading.set(true);
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        return;
      }

      const response = await fetch(this.GET_URL, {
        method: 'GET',
        headers: {
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al obtener los consultorios.');
      }

      // Desencriptar la respuesta recibida
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedData.success && Array.isArray(decryptedData.consultorios)) {
        // Mapeamos para asegurar consistencia en la propiedad 'id' de la interfaz
        const listadoMapeado = decryptedData.consultorios.map((c: any) => ({
          ...c,
          id: c.idConsultorio || c.id || ''
        }));
        this.consultorios.set(listadoMapeado);
      }
    } catch (err) {
      console.error('Error al cargar consultorios:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  addConsultorio() {
    const nuevo: Consultorio = {
      id: '',
      name: '',
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
      services: [{ name: '', price: 0 }],
      insurancePolicy: 'privateOnly',
      patientTypes: { adults: true, children: false },
      totalPatients: 0,
      totalDoctors: 1
    };
    this.selectedConsultorio.set(nuevo);
    this.isEditingMode = true;
    this.activeIdx = this.consultorios().length;
  }

  verDetalle(c: Consultorio, index: number) {
    this.selectedConsultorio.set({ ...c });
    this.activeIdx = index;
    this.isEditingMode = false; // Modo solo lectura
  }

  editarConsultorio(c: Consultorio, index: number) {
    this.selectedConsultorio.set({ ...c });
    this.activeIdx = index;
    this.isEditingMode = true; // Modo edición habilitado
  }

  regresarAListado() {
    this.selectedConsultorio.set(null);
    this.cargarConsultorios(); // Recargar al volver por si hubo cambios
  }

  async guardarConsultorioIndividual() {
    try {
      const sessionData = this.authService.getSession();
      const jwtToken = sessionData?.sessionToken;

      if (!jwtToken) {
        alert('No se encontró una sesión activa. Inicie sesión nuevamente.');
        return;
      }

      const consultorioActual = this.selectedConsultorio();
      if (!consultorioActual || !consultorioActual.name.trim()) {
        alert('El nombre del consultorio es obligatorio.');
        return;
      }

      const payload = {
        idConsultorio: typeof consultorioActual.id === 'string' && consultorioActual.id !== '' ? consultorioActual.id : null,
        name: consultorioActual.name,
        city: consultorioActual.city,
        address: consultorioActual.address,
        postalCode: consultorioActual.postalCode,
        additionalInfo: consultorioActual.additionalInfo,
        website: consultorioActual.website,
        phoneMain: consultorioActual.phoneMain,
        phoneSecondary: consultorioActual.phoneSecondary,
        accessibility: consultorioActual.accessibility,
        directions: consultorioActual.directions,
        paymentMethods: consultorioActual.paymentMethods,
        services: consultorioActual.services,
        insurancePolicy: consultorioActual.insurancePolicy,
        patientTypes: consultorioActual.patientTypes,
        totalPatients: consultorioActual.totalPatients,
        totalDoctors: consultorioActual.totalDoctors
      };

      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

      const response = await fetch(this.SAVE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': this.APP_SECRET_HEADER,
          'x-client-source': 'angular',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({ encryptedData: ciphertext })
      });

      const jsonRes = await response.json();
      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al guardar el consultorio.');
      }

      alert('¡Consultorio guardado/actualizado y sincronizado con éxito!');
      this.selectedConsultorio.set(null);
      this.cargarConsultorios();

    } catch (err: any) {
      console.error('Error al guardar consultorio:', err);
      alert(err.message || 'Error de conexión con el servidor.');
    }
  }

  eliminarConsultorio(id: number | string) {
    this.consultorios.update(list => list.filter(c => c.id !== id));
  }

  addService(consultorio: Consultorio) {
    consultorio.services.push({ name: '', price: 0 });
  }

  removeService(consultorio: Consultorio, index: number) {
    consultorio.services.splice(index, 1);
  }
}
