import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LucideAngularModule, Plus, MoreVertical, LayoutGrid, List, CheckCircle2, Trash2, Check, Sparkles, Shield, Zap, X, Loader2, Tag } from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { TokenInterceptorService } from '../auth/token-interceptor.service';
import CryptoJS from 'crypto-js';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './planes.component.html'
})
export class PlansComponent implements OnInit, OnDestroy {
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  private authService = inject(AuthService);
  private tokenInterceptor = inject(TokenInterceptorService);
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
  readonly Loader2 = Loader2;
  readonly Tag = Tag;

  private readonly ENCRYPTION_KEY = 'd12f53caa18869e74ea7ccdd8ccf97618b018254d83aaf0b8037d4a89ebbde5b';
  private readonly APP_SECRET_HEADER = '0ffd8e9336c08f1d7449509b02dcfabb';
  private readonly GET_SUBSCRIPTIONS_URL = 'https://getsubscriptions-o7vmreizjq-uc.a.run.app';
  private readonly SUBSCRIBE_URL = 'https://createstripecheckoutsession-fjo7ia7ora-uc.a.run.app';

  isLoading = signal<boolean>(true);
  isGridMode = signal<boolean>(false);

  showSubscribeModal = signal<boolean>(false);
  selectedSubscriptionTier = signal<any>(null);

  // 🔄 Señal para controlar el loader específico al procesar el pago o servicio de suscripción
  isSubscribing = signal<boolean>(false);
  subscribingPlanId = signal<string | null>(null); // Para saber exactamente cuál tarjeta está cargando

  idBranch: string = 'BEAST-TESISTAN';
  subscriptions = signal<any[]>([]);
  userData: any = null;

  selectedPlanId = signal<string | null>(null);

  showSuccessDialog = signal<boolean>(false);
  successMessage = signal<string>('');
  showAiModal = signal<boolean>(false);

  ngOnInit(): void {
    this.userData = this.authService.getSession();
    console.log('🔍 [PlansComponent] Sesión inicial del usuario:', this.userData);
    this.cargarSuscripciones();
  }

  ngOnDestroy(): void {}

  async cargarSuscripciones() {
    this.isLoading.set(true);
    try {
      const response = await this.tokenInterceptor.executeWithAuth(async (token) => {
        const payload = {
          idBranch: this.userData?.brancheInUser?.[0] || this.idBranch,
          idDoctor: this.userData?.email || ''
        };
        const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(payload), this.ENCRYPTION_KEY).toString();

        const fetchRes = await fetch(this.GET_SUBSCRIPTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-signature': this.APP_SECRET_HEADER,
            'x-client-source': 'angular',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ encryptedData: ciphertext })
        });

        return fetchRes;
      });

      const jsonRes = await response.json();

      if (!response.ok) {
        throw new Error(jsonRes.error || 'Error al obtener las suscripciones.');
      }

      const bytes = CryptoJS.AES.decrypt(jsonRes.encryptedData, this.ENCRYPTION_KEY);
      const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      console.log('📦 [PlansComponent] Suscripciones descargadas de la API:', decryptedData.subscriptions);

      if (decryptedData.success && Array.isArray(decryptedData.subscriptions)) {
        this.subscriptions.set(decryptedData.subscriptions);

        if (decryptedData.subscriptions.length > 0) {
          this.selectedPlanId.set(decryptedData.subscriptions[0].idSuscription);
        }
      }
    } catch (err) {
      console.error('❌ Error al cargar suscripciones:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectPlan(subId: string) {
    this.selectedPlanId.set(subId);
  }

  abrirModalIa(event: Event) {
    event.stopPropagation();
    this.showAiModal.set(true);
  }

  abrirSuscripcion(sub: any, event: Event) {
    event.stopPropagation();
    this.selectedSubscriptionTier.set(sub);
    this.showSubscribeModal.set(true);
  }

  async suscribirsePlanMedico() {
    const sub = this.selectedSubscriptionTier();
    if (!sub) return;

    const body = {
      priceId: sub.stripePriceId || sub.idSuscription,
      customerEmail: this.userData?.email || 'doctor@tusistema.com',
      type: sub.type
    };

    this.isSubscribing.set(true);
    this.subscribingPlanId.set(sub.idSuscription);

    this.http.post<any>(this.SUBSCRIBE_URL, body, { headers: this.headers }).subscribe({
      next: (response) => {
        this.isSubscribing.set(false);
        this.subscribingPlanId.set(null);
        this.showSubscribeModal.set(false);

        if (response && response.success && response.url) {
          window.location.href = response.url;
        } else {
          alert('No se pudo iniciar la pasarela de pago.');
        }
      },
      error: (err) => {
        this.isSubscribing.set(false);
        this.subscribingPlanId.set(null);
        this.showSubscribeModal.set(false);
        console.error('Error de conexión al procesar el pago:', err);
        alert('Hubo un error al procesar la solicitud de pago.');
      }
    });
  }

// 🌟 Evaluación precisa con LOGS detallados de comparación
  getSubscriptionStatus(subId: string): { label: string; actionType: 'current' | 'renew' | 'acquire'; disabled: boolean } {
    const session = this.authService.getSession();

    const currentId = session?.currentIdSuscription;
    const isPlanActive = session?.statusSuscription === true;
    const expirationDateStr = session?.expirationSuscription;

    console.log(`🔎 [Evaluando Plan Card] ID de tarjeta: "${subId}" | ID en Sesión (currentIdSuscription): "${currentId}" | ¿Son iguales?: ${currentId === subId}`);
    console.log(`📊 [Estatus de Sesión] statusSuscription:`, session?.statusSuscription, `| Expiración:`, expirationDateStr);

    const isCurrentPlan = currentId === subId;

    if (!isCurrentPlan) {
      return { label: 'Adquirir plan', actionType: 'acquire', disabled: false };
    }

    if (!isPlanActive) {
      console.warn(`⚠️ [PlansComponent] El plan coincide (${subId}), pero 'statusSuscription' no es true.`);
      return { label: 'Renovar plan', actionType: 'renew', disabled: false };
    }

    if (expirationDateStr) {
      try {
        const expirationDate = new Date(expirationDateStr);
        const now = new Date();
        if (now > expirationDate) {
          console.warn(`⚠️ [PlansComponent] El plan coincide (${subId}), pero ya expiró con fecha: ${expirationDateStr}`);
          return { label: 'Renovar plan', actionType: 'renew', disabled: false };
        }
      } catch (e) {
        console.error('Error al parsear fecha de expiración', e);
      }
    }

    console.log(`🎉 [PlansComponent] ¡Plan actual detectado y vigente! Coincide con: ${subId}`);
    return { label: 'PLAN ACTUAL', actionType: 'current', disabled: true };
  }
}
