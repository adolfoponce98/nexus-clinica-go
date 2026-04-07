import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Plus, MoreVertical, LayoutGrid, List } from 'lucide-angular';

interface Plan {
  id: number;
  name: string;
  price: number;
  credits: string;
  validity: string;
  type: 'Paquete' | 'Suscripción';
  tag?: string;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './planes.component.html'
})
export class PlansComponent {
  readonly Plus = Plus;
  readonly MoreVertical = MoreVertical;
  readonly LayoutGrid = LayoutGrid;
  readonly List = List;

  // Estado del formulario
  currentPlan = signal<Plan>({
    id: 0, name: '', price: 0, credits: '', validity: '30 días', type: 'Paquete'
  });

  selectedId = signal<number | null>(null);

  // Catálogo de planes inicial
  plans = signal<Plan[]>([
    { id: 1, name: 'Premium Annual', price: 18500, credits: 'Unlimited', validity: '365 Days', type: 'Suscripción', tag: 'ACTIVE' },
    { id: 2, name: '10 Class Pack', price: 2200, credits: '10 Sessions', validity: '60 Days', type: 'Paquete', tag: 'PACKAGE' },
    { id: 3, name: 'Intro 3-Pack', price: 450, credits: '3 Sessions', validity: '15 Days', type: 'Paquete', tag: 'NEW JOINER' }
  ]);

  // Historial simulado
  recentActivations = signal([
    { user: 'Ricardo Mendoza', plan: 'Monthly Unlimited', amount: 3400, expires: 'Oct 24, 2023', status: 'PAID' },
    { user: 'Sofia Valdes', plan: '10 Class Pack', amount: 2200, expires: 'Nov 12, 2023', status: 'PAID' },
    { user: 'Arturo Lopez', plan: 'Premium Annual', amount: 18500, expires: 'Sep 30, 2024', status: 'PENDING' }
  ]);

  selectPlan(plan: Plan) {
    this.selectedId.set(plan.id);
    this.currentPlan.set({ ...plan });
  }

  savePlan() {
    const planData = this.currentPlan();
    if (planData.id === 0) {
      // Crear nuevo
      const newPlan = { ...planData, id: Date.now() };
      this.plans.update(p => [...p, newPlan]);
    } else {
      // Editar existente
      this.plans.update(p => p.map(item => item.id === planData.id ? planData : item));
    }
    this.resetForm();
  }

  resetForm() {
    this.selectedId.set(null);
    this.currentPlan.set({ id: 0, name: '', price: 0, credits: '', validity: '30 días', type: 'Paquete' });
  }
}
