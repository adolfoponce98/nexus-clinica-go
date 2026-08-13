import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, MoreVertical, LayoutGrid, List } from 'lucide-angular';
import { collection, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore';
import { PaqueteMemberShipModel } from './planes.model';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './planes.component.html'
})
export class PlansComponent implements OnInit, OnDestroy {
  readonly Plus = Plus;
  readonly MoreVertical = MoreVertical;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;
  private unsubscribe?: Unsubscribe;

  // ID de sucursal actual (puedes ajustarlo o pasarlo dinámicamente)
  idBranch: string = 'BEAST-TESISTAN';

  // Estado del formulario mapeado directamente al modelo de Firebase
  currentPlan = signal<PaqueteMemberShipModel>({
    idPaquete: '',
    name: '',
    descripcion: '',
    tipoMmebresia: 1, // 1: Paquete, 2: Suscripción (por ejemplo)
    creditos: 0,
    precioRegular: 0,
    precioDescuento: 0,
    beneficios: [],
    fechaCreacion: '',
    idAdmin: '',
    idBranch: this.idBranch
  });

  selectedId = signal<string | null>(null);

  // Lista reactiva de planes cargada desde Firestore
  plans = signal<PaqueteMemberShipModel[]>([]);

  // Historial simulado (mantenido intacto por diseño)
  recentActivations = signal([
    { user: 'Ricardo Mendoza', plan: 'Monthly Unlimited', amount: 3400, expires: 'Oct 24, 2023', status: 'PAID' },
    { user: 'Sofia Valdes', plan: '10 Class Pack', amount: 2200, expires: 'Nov 12, 2023', status: 'PAID' },
    { user: 'Arturo Lopez', plan: 'Premium Annual', amount: 18500, expires: 'Sep 30, 2024', status: 'PENDING' }
  ]);

  ngOnInit(): void {
    this.loadPlansRealtime(this.idBranch);
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadPlansRealtime(branchId: string) {
    const db = getFirestore();
    const plansRef = collection(db, `membresias/${branchId}/membrecias`); // O la ruta de tu colección de planes

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
          idBranch: data.idBranch || branchId
        };
      });

      this.plans.set(firebasePlans);
    }, (error) => {
      console.error('Error al escuchar los planes:', error);
    });
  }

  selectPlan(plan: PaqueteMemberShipModel) {
    this.selectedId.set(plan.idPaquete || null);
    this.currentPlan.set({ ...plan });
  }

  savePlan() {
    const planData = this.currentPlan();
    // Lógica de guardado o actualización en Firestore / Servicio
    if (!this.selectedId()) {
      // Crear nuevo localmente o vía API/Firestore
      const newPlan = { ...planData, idPaquete: 'PLAN-' + Date.now() };
      this.plans.update(p => [...p, newPlan]);
    } else {
      // Editar existente
      this.plans.update(p => p.map(item => item.idPaquete === planData.idPaquete ? planData : item));
    }
    this.resetForm();
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
      idBranch: this.idBranch
    });
  }
}