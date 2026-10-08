import { Component, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, Plus, MoreVertical, LayoutGrid, List, CheckCircle2, Trash2, Check, Sparkles, Shield, Zap, X } from 'lucide-angular';
import { collection, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore';
import { PaqueteMemberShipModel } from './planes.model';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './planes.component.html'
})
export class PlansComponent implements OnInit, OnDestroy {
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  readonly Plus = Plus;
  readonly MoreVertical = MoreVertical;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  readonly Trash2 = Trash2;
  readonly CheckCircle2 = CheckCircle2;
  readonly Check = Check;
  readonly Sparkles = Sparkles;
  readonly Shield = Shield;
  readonly Zap = Zap;
  readonly X = X;

  isGridMode = signal<boolean>(false);
  private unsubscribe?: Unsubscribe;
  showDeleteConfirmModal = signal<boolean>(false);
  isDeleting = signal<boolean>(false);

  // Estados para el Modal de Confirmación de Suscripción
  showSubscribeModal = signal<boolean>(false);
  selectedSubscriptionTier = signal<'pro'>('pro');
  isSubscribing = signal<boolean>(false);

  private apiUrl = 'https://crearmembresia-rdotx3vmaq-uc.a.run.app';
  private apiDeleteUrl = 'https://eliminarmembresia-rdotx3vmaq-uc.a.run.app';
  idBranch: string = 'BEAST-TESISTAN';

  billingCycle = signal<'mensual' | 'trimestral' | 'semestral' | 'anual'>('anual');
  selectedPlanTier = signal<'pro'>('pro');

  tierDefinitions = {
    pro: {
      name: 'Plan Pro Médico',
      baseMonthly: 899,
      description: 'Acceso total a todas las herramientas avanzadas, consultorios ilimitados y 100 min de IA mensuales.',
      badge: 'Plan Todo Incluido',
      consultorios: '5 presenciales + 1 online',
      mensajes: '5,000 mensajes / mes',
      transcripcion: '100 min gratis mensuales'
    }
  };

  calculatedPrices = computed(() => {
    const cycle = this.billingCycle();
    const base = this.tierDefinitions.pro.baseMonthly;
    let price = base;
    let discountLabel = 'Facturado mensualmente';

    if (cycle === 'trimestral') {
      price = (base * 3) * 0.95;
      discountLabel = 'Facturado trimestralmente (5% desc.)';
    } else if (cycle === 'semestral') {
      price = (base * 6) * 0.90;
      discountLabel = 'Facturado semestralmente (10% desc.)';
    } else if (cycle === 'anual') {
      price = (base * 12) * 0.85;
      discountLabel = 'Facturado anualmente (15% desc.)';
    }

    return {
      pro: Math.round(price),
      label: discountLabel,
      cycleName: cycle.toUpperCase()
    };
  });

  currentPlan = signal<PaqueteMemberShipModel & { visibleParaUsuario?: boolean }>({
    idPaquete: '',
    name: '',
    descripcion: '',
    tipoMmebresia: 1,
    creditos: 0,
    precioRegular: 0,
    precioDescuento: 0,
    beneficios: [],
    fechaCreacion: '',
    idAdmin: '',
    idBranch: this.idBranch,
    visibleParaUsuario: true
  });

  selectedId = signal<string | null>(null);
  plans = signal<PaqueteMemberShipModel[]>([]);
  userData: any = null;
  showSuccessDialog = signal<boolean>(false);
  successMessage = signal<string>('');

  showAiModal = signal<boolean>(false);

// Métodos para controlar el modal de IA:
abrirModalIa(event: Event) {
  event.stopPropagation();
  this.showAiModal.set(true);
}

comprarCreditosIaFromModal() {
  this.showAiModal.set(false);
  // Llama a tu pasarela existente
  const fakeEvent = new Event('click');
  this.comprarCreditosIa(fakeEvent);
}

  ngOnInit(): void {
    this.loadPlansRealtime(this.idBranch);
    this.userData = this.authService.getSession();
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadPlansRealtime(branchId: string) {
    const db = getFirestore();
    const plansRef = collection(db, `membresias/${branchId}/membrecias`);

    this.unsubscribe = onSnapshot(plansRef, (snapshot) => {
      const firebasePlans: PaqueteMemberShipModel[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          idPaquete: doc.id,
          name: data.name || '',
          descripcion: data.descripcion || '',
          tipoMmebresia: data.tipoMmebresia ?? 1,
          creditos: data.creditos ?? 0,
          precioRegular: data.precioRegular ?? 0,
          precioDescuento: data.precioDescuento ?? 0,
          beneficios: data.beneficios || [],
          fechaCreacion: data.fechaCreacion || '',
          idAdmin: data.idAdmin || '',
          idBranch: data.idBranch || branchId,
          visibleParaUsuario: data.visibleParaUsuario ?? true
        };
      });
      this.plans.set(firebasePlans);
    }, (error) => {
      console.error('Error al escuchar los planes:', error);
    });
  }

  selectTier(tier: 'pro') {
    this.selectedPlanTier.set(tier);
  }

  // Abrir modal de confirmación de suscripción
  abrirSuscripcion(tier: 'pro', event: Event) {
    event.stopPropagation(); // Evita conflicto con eventos padre
    this.selectedSubscriptionTier.set(tier);
    this.showSubscribeModal.set(true);
  }

  // Método para comprar créditos adicionales de IA ($199 MXN)
  comprarCreditosIa(event: Event) {
    event.stopPropagation();
    const urlCloudFunction = 'https://createstripecheckoutsession-fjo7ia7ora-uc.a.run.app';

    const body = {
      priceId: 'price_ID_CREDITOS_EXTRA_STRIPE', // Reemplaza con tu ID de Stripe para los creditos extra de 199
      customerEmail: this.userData?.email || 'doctor@tusistema.com'
    };

    this.http.post<any>(urlCloudFunction, body, { headers: this.headers }).subscribe({
      next: (response) => {
        if (response && response.success && response.url) {
          window.location.href = response.url;
        } else {
          alert('No se pudo iniciar la pasarela de pago para los créditos.');
        }
      },
      error: (err) => {
        console.error('Error de conexión con Stripe:', err);
      }
    });
  }

  async suscribirsePlanMedico() {
    const urlCloudFunction = 'https://createstripecheckoutsession-fjo7ia7ora-uc.a.run.app';

    const body = {
      priceId: 'price_1UJimKHLs0r0bFs5BuXrcVuz', // El ID del producto/precio del Plan Único en Stripe Dashboard
      customerEmail: this.userData?.email || 'doctor@tusistema.com'
    };

    this.isSubscribing.set(true);
    this.http.post<any>(urlCloudFunction, body, { headers: this.headers }).subscribe({
      next: async (response) => {
        this.isSubscribing.set(false);
        if (response && response.success && response.url) {
          window.location.href = response.url;
        } else {
          alert('No se pudo iniciar la pasarela de pago.');
        }
      },
      error: (err) => {
        this.isSubscribing.set(false);
        console.error('Error de conexión con Stripe:', err);
      }
    });
  }

  confirmarEliminacion() {
    if (!this.selectedId()) return;
    this.showDeleteConfirmModal.set(true);
  }

  ejecutarEliminacion() {
    const planId = this.selectedId();
    if (!planId) return;

    this.isDeleting.set(true);
    const payload = {
      idBranch: this.userData?.brancheInUser?.[0] || this.idBranch,
      idPaquete: planId
    };

    this.http.post<{ success: boolean; message: string; id: string }>(this.apiDeleteUrl, payload).subscribe({
      next: (response) => {
        this.isDeleting.set(false);
        this.showDeleteConfirmModal.set(false);
        if (response && response.success) {
          this.successMessage.set('¡Membresía eliminada exitosamente!');
          this.showSuccessDialog.set(true);
          this.resetForm();
        } else {
          alert('Error al eliminar: ' + (response?.message || 'Error desconocido'));
        }
      },
      error: (error) => {
        this.isDeleting.set(false);
        this.showDeleteConfirmModal.set(false);
        console.error('Error al eliminar:', error);
        alert('Hubo un error de red al intentar eliminar el paquete.');
      }
    });
  }

  savePlan() {
    const planData = this.currentPlan();
    planData.idAdmin = this.userData?.email || '';
    planData.idBranch = this.userData?.brancheInUser?.[0] || '';
    planData.name = this.currentPlan().name || 'Sin nombre';

    const payload: PaqueteMemberShipModel = {
      ...planData,
      idPaquete: this.selectedId() ? this.selectedId()! : 'PLAN-' + Date.now(),
      fechaCreacion: planData.fechaCreacion || new Date().toISOString()
    };

    this.http.post<{ success: boolean; branchId: string }>(this.apiUrl, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set(this.selectedId() ? '¡Plan actualizado correctamente!' : '¡Nuevo plan guardado correctamente!');
          this.showSuccessDialog.set(true);
          this.resetForm();
        }
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        alert('Hubo un error al guardar los cambios en el servidor.');
      }
    });
  }

  resetForm() {
    this.selectedId.set(null);
    this.currentPlan.set({
      idPaquete: '',
      name: '',
      descripcion: '',
      tipoMmebresia: 1,
      creditos: 0,
      precioRegular: 0,
      precioDescuento: 0,
      beneficios: [],
      fechaCreacion: '',
      idAdmin: '',
      idBranch: this.idBranch,
      visibleParaUsuario: true
    });
  }
}
