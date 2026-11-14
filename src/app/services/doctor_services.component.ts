import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Stethoscope, Plus, Trash2, Edit3, Check,
  Building2, DollarSign, Percent, Loader2, FileText, CheckSquare, Square, Clock
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';

export interface Sucursal {
  idConsultorio: string;
  nombre: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  precioBase: number;
  aplicaIva: boolean;
  precioFinal: number;
  sucursales: string[]; // IDs de sucursales o ['TODAS']
  recurrenciaCantidad?: number | null;
  recurrenciaUnidad?: 'dias' | 'semanas' | 'meses' | null;
}

@Component({
  selector: 'app-servicios-consultorio',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: 'doctor_services.component.html'
})
export class ServiciosConsultorioComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly icons = {
    Stethoscope, Plus, Trash2, Edit3, Check,
    Building2, DollarSign, Percent, Loader2, FileText, CheckSquare, Square, Clock
  };

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
  private readonly SAVE_URL = 'https://savedoctorservice-o7vmreizjq-uc.a.run.app';

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  currentEditId = signal<string | null>(null);

  // Lista de sucursales reales obtenidas desde AuthService
  sucursalesList = signal<Sucursal[]>([]);

  servicios = signal<Servicio[]>([]);

  // Formulario reactivo con campos de recurrencia opcionales
  servicioForm = new FormGroup({
    nombre: new FormControl('', Validators.required),
    precioBase: new FormControl(0, [Validators.required, Validators.min(0)]),
    aplicaIva: new FormControl(false),
    sucursalesSeleccionadas: new FormControl<string[]>([], Validators.required),
    recurrenciaCantidad: new FormControl<number | null>(null, [Validators.min(1)]),
    recurrenciaUnidad: new FormControl<'dias' | 'semanas' | 'meses' | null>(null)
  });

  ngOnInit() {
    this.cargarSucursalesYServicios();
  }

  cargarSucursalesYServicios() {
    this.isLoading.set(true);
    try {
      // 1. Cargar las sucursales reales guardadas en memoria/AuthService
      const savedBranches = this.authService.getAllBranches();
      if (savedBranches && savedBranches.length > 0) {
        // Mapeamos asegurando las propiedades correctas idConsultorio y nombre
        const mappedBranches: Sucursal[] = savedBranches.map((b: any) => ({
          idConsultorio: b.idConsultorio || b.id || '',
          nombre: b.name || b.nombre || 'Consultorio'
        }));
        this.sucursalesList.set(mappedBranches);
      } else {
        // Fallback si estuviera vacío
        const activeSucursal = this.authService.getSucursal();
        if (activeSucursal) {
          this.sucursalesList.set([{
            idConsultorio: activeSucursal.idConsultorio || '4S5LMaJ2hdx8J3xx6CUj',
            nombre: activeSucursal.name || activeSucursal.nombre || 'Consultorio Principal'
          }]);
        }
      }

      // 2. Cargar servicios existentes de la sucursal activa o caché
      const activeSucursal = this.authService.getSucursal();
      if (activeSucursal && (activeSucursal as any).services) {
        this.servicios.set((activeSucursal as any).services);
      } else {
        this.servicios.set([]);
      }
    } catch (err) {
      console.error('Error al cargar sucursales y servicios:', err);
      this.servicios.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  abrirModalNuevo() {
    this.editMode.set(false);
    this.currentEditId.set(null);
    this.servicioForm.reset({
      aplicaIva: false,
      precioBase: 0,
      sucursalesSeleccionadas: [],
      recurrenciaCantidad: null,
      recurrenciaUnidad: null
    });
    this.showModal.set(true);
  }

  abrirModalEditar(servicio: Servicio) {
    this.editMode.set(true);
    this.currentEditId.set(servicio.id);
    this.servicioForm.patchValue({
      nombre: servicio.nombre,
      precioBase: servicio.precioBase,
      aplicaIva: servicio.aplicaIva,
      sucursalesSeleccionadas: servicio.sucursales,
      recurrenciaCantidad: servicio.recurrenciaCantidad || null,
      recurrenciaUnidad: servicio.recurrenciaUnidad || null
    });
    this.showModal.set(true);
  }

  onSucursalChange(idSucursal: string, event: any) {
    const isChecked = event.target.checked;
    let seleccionadas: string[] = [...(this.servicioForm.get('sucursalesSeleccionadas')?.value || [])];

    if (idSucursal === 'TODAS') {
      if (isChecked) {
        seleccionadas = ['TODAS'];
      } else {
        seleccionadas = [];
      }
    } else {
      seleccionadas = seleccionadas.filter(s => s !== 'TODAS');
      if (isChecked) {
        seleccionadas.push(idSucursal);
      } else {
        seleccionadas = seleccionadas.filter(s => s !== idSucursal);
      }
    }

    this.servicioForm.patchValue({ sucursalesSeleccionadas: seleccionadas });
  }

  isSucursalChecked(idSucursal: string): boolean {
    const seleccionadas = this.servicioForm.get('sucursalesSeleccionadas')?.value || [];
    return seleccionadas.includes('TODAS') || seleccionadas.includes(idSucursal);
  }

  isTodasChecked(): boolean {
    const seleccionadas = this.servicioForm.get('sucursalesSeleccionadas')?.value || [];
    return seleccionadas.includes('TODAS');
  }

  async guardarServicio() {
    if (this.servicioForm.invalid) {
      alert('Por favor completa los campos obligatorios y selecciona al menos una sucursal.');
      return;
    }

    const sessionData = this.authService.getSession();
    const jwtToken = sessionData?.sessionToken;

    if (!jwtToken) {
      alert('No se encontró una sesión activa o token válido.');
      return;
    }

    const idDoctor = sessionData.email ? sessionData.email.trim().toLowerCase().replace(/[\/\\]/g, "_") : 'default_doctor';

    // Obtener las sucursales seleccionadas en el formulario
    const sucursalesFormVal = this.servicioForm.get('sucursalesSeleccionadas')?.value || [];

    // Si seleccionó 'TODAS', mapeamos todos los IDs reales disponibles en la lista de sucursales
    let idsConsultoriosToSave: string[] = [];
    if (sucursalesFormVal.includes('TODAS')) {
      idsConsultoriosToSave = this.sucursalesList().map(s => s.idConsultorio);
    } else {
      idsConsultoriosToSave = sucursalesFormVal;
    }

    // Fallback por seguridad si estuviera vacío
    if (idsConsultoriosToSave.length === 0) {
      const activeSucursal = this.authService.getSucursal();
      idsConsultoriosToSave = [activeSucursal?.idConsultorio || '4S5LMaJ2hdx8J3xx6CUj'];
    }

    const formVal = this.servicioForm.value;
    const precioBase = Number(formVal.precioBase) || 0;
    const aplicaIva = !!formVal.aplicaIva;
    const precioFinal = aplicaIva ? precioBase * 1.16 : precioBase;

    this.isSaving.set(true);

    try {
      const nuevoServicio: Servicio = {
        id: this.currentEditId() || Date.now().toString(),
        nombre: formVal.nombre || '',
        precioBase: precioBase,
        aplicaIva: aplicaIva,
        precioFinal: Number(precioFinal.toFixed(2)),
        sucursales: sucursalesFormVal,
        recurrenciaCantidad: formVal.recurrenciaCantidad ? Number(formVal.recurrenciaCantidad) : null,
        recurrenciaUnidad: formVal.recurrenciaUnidad || null
      };

      // Payload enviando idsConsultorios como lista de strings en lugar de idConsultorio singular
      const rawData = {
        idDoctor: idDoctor,
        idsConsultorios: idsConsultoriosToSave,
        servicio: nuevoServicio
      };

      // 🔐 Encriptar payload con AES
      const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(rawData), this.ENCRYPTION_KEY).toString();

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
        throw new Error(jsonRes.error || 'Error al guardar el servicio en el servidor.');
      }

      // 🔓 Desencriptar respuesta
      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedResponse = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      if (decryptedResponse && decryptedResponse.success) {
        if (this.editMode()) {
          this.servicios.update(lista =>
            lista.map(s => s.id === this.currentEditId() ? nuevoServicio : s)
          );
        } else {
          this.servicios.update(lista => [nuevoServicio, ...lista]);
        }
        // 🚀 NUEVO: Guardar los servicios actualizados en la caché local
        const listaActualizada = this.servicios();
        this.authService.saveServicesToActiveSucursal(listaActualizada);

        // Si el servicio afecta a múltiples sucursales, actualizamos cada una en la lista general
        idsConsultoriosToSave.forEach(idSuc => {
          this.authService.updateServicesInBranch(idSuc, listaActualizada);
        });
        this.showModal.set(false);
      } else {
        throw new Error(decryptedResponse?.error || 'Error desconocido al procesar el servidor.');
      }
    } catch (err: any) {
      console.error('Error al guardar servicio:', err);
      alert(err.message || 'Hubo un error al guardar el servicio.');
    } finally {
      this.isSaving.set(false);
    }
  }

  eliminarServicio(id: string) {
    if (confirm('¿Estás seguro de eliminar este servicio del catálogo?')) {
      this.servicios.update(lista => lista.filter(s => s.id !== id));
    }
  }

  getNombreSucursal(sucursalId: string): string {
    if (sucursalId === 'TODAS') return 'Todas las sucursales';
    const suc = this.sucursalesList().find(s => s.idConsultorio === sucursalId);
    return suc ? suc.nombre : sucursalId;
  }

  formatearRecurrencia(cantidad?: number | null, unidad?: string | null): string {
    if (!cantidad || !unidad) return 'Sin recordatorio automático';
    return `Cada ${cantidad} ${unidad}`;
  }
}
