import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Plus, MoreVertical, LayoutGrid, List, CheckCircle2 } from 'lucide-angular';
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
  private authService = inject(AuthService);
  readonly Plus = Plus;
  readonly MoreVertical = MoreVertical;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  readonly CheckCircle2 = CheckCircle2;
  isGridMode = signal<boolean>(false); // Por defecto en modo lista
  private http = inject(HttpClient);
  private unsubscribe?: Unsubscribe;

  // URL del servicio proporcionado
  private apiUrl = 'https://crearmembresia-rdotx3vmaq-uc.a.run.app';

  idBranch: string = 'BEAST-TESISTAN';

  // Estado del formulario ampliado con el campo booleano para mostrar al usuario
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
    visibleParaUsuario: true // Valor por defecto
  });

  selectedId = signal<string | null>(null);
  plans = signal<PaqueteMemberShipModel[]>([]);
   userData: any = null;
  // Estado para controlar el diálogo de éxito
  showSuccessDialog = signal<boolean>(false);
  successMessage = signal<string>('');

  recentActivations = signal([
    { user: 'Ricardo Mendoza', plan: 'Monthly Unlimited', amount: 3400, expires: 'Oct 24, 2023', status: 'PAID' },
    { user: 'Sofia Valdes', plan: '10 Class Pack', amount: 2200, expires: 'Nov 12, 2023', status: 'PAID' },
    { user: 'Arturo Lopez', plan: 'Premium Annual', amount: 18500, expires: 'Sep 30, 2024', status: 'PENDING' }
  ]);

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

  selectPlan(plan: PaqueteMemberShipModel) {
   this.selectedId.set(plan.idPaquete || null);
  this.currentPlan.set({
    ...plan,
    idPaquete: plan.idPaquete || '', // Asegura que el idPaquete se mantenga para el update
    visibleParaUsuario: (plan as any).visibleParaUsuario ?? true
  });
  }

  savePlan() {
    const planData = this.currentPlan();
    planData.idAdmin =this.userData?.email || ''
    planData.idBranch = this.userData?.brancheInUser?.[0] || ""
    planData.name =this.currentPlan().name||"Sin nombre"
    planData.precioRegular=this.currentPlan().precioRegular
    planData.precioDescuento=this.currentPlan().precioRegular

    // Asignar ID si es nuevo
    const payload: PaqueteMemberShipModel = {
      ...planData,
      idPaquete: this.selectedId() ? this.selectedId()! : 'PLAN-' + Date.now(),
      fechaCreacion: planData.fechaCreacion || new Date().toISOString()
    };

    // Consumo del servicio HTTP
    this.http.post<{ success: boolean; branchId: string }>(this.apiUrl, payload).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set(this.selectedId() ? '¡Plan actualizado correctamente!' : '¡Nuevo plan guardado correctamente!');
          this.showSuccessDialog.set(true);
          this.resetForm();
        }
      },
      error: (error) => {
        console.error('Error al consumir el servicio de membresía:', error);
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
