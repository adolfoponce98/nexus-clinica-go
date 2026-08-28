import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Plus, X, CheckCircle2 } from 'lucide-angular';
import { PaqueteMemberShipModel } from '../../../planes/planes.model';

@Component({
  selector: 'app-plan-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: 'nuevo-plan-modal.component.html'
})
export class PlanModalComponent {
  private http = inject(HttpClient);

  readonly Plus = Plus;
  readonly X = X;
  readonly CheckCircle2 = CheckCircle2;

  // Entradas desde el componente padre
  @Input() isOpen = false;
  @Input() idBranch = 'BEAST-TESISTAN';
  @Input() userEmail = '';

  // Salidas hacia el componente padre
  @Output() close = new EventEmitter<void>();
  @Output() planCreated = new EventEmitter<void>();

  private apiUrl = 'https://crearmembresia-rdotx3vmaq-uc.a.run.app';

  isLoading = false;
  showSuccessDialog = false;
  successMessage = '';

  // Modelo exclusivo para crear un plan nuevo
  newPlan = signal<{
    name: string;
    descripcion: string;
    tipoMmebresia: number;
    creditos: number;
    precioRegular: number;
    visibleParaUsuario: boolean;
  }>({
    name: '',
    descripcion: '',
    tipoMmebresia: 1,
    creditos: 0,
    precioRegular: 0,
    visibleParaUsuario: true
  });

  cerrarModal() {
    this.resetForm();
    this.close.emit();
  }

  savePlan() {
    const plan = this.newPlan();
    if (!plan.name.trim()) {
      alert('Por favor ingresa un nombre para el plan.');
      return;
    }

    this.isLoading = true;

    const payload: PaqueteMemberShipModel & { visibleParaUsuario?: boolean } = {
      idPaquete: 'PLAN-' + Date.now(),
      name: plan.name,
      descripcion: plan.descripcion,
      tipoMmebresia: plan.tipoMmebresia,
      creditos: plan.creditos,
      precioRegular: plan.precioRegular,
      precioDescuento: plan.precioRegular,
      beneficios: [],
      fechaCreacion: new Date().toISOString(),
      idAdmin: this.userEmail,
      idBranch: this.idBranch,
      visibleParaUsuario: plan.visibleParaUsuario
    };

    this.http.post<{ success: boolean; branchId: string }>(this.apiUrl, payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.success) {
          this.successMessage = '¡Nuevo plan guardado correctamente!';
          this.showSuccessDialog = true;
          this.planCreated.emit(); // Avisa al padre que se creó uno nuevo
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error al consumir el servicio de membresía:', error);
        alert('Hubo un error al guardar los cambios en el servidor.');
      }
    });
  }

  finalizarExito() {
    this.showSuccessDialog = false;
    this.resetForm();
    this.close.emit();
  }

  resetForm() {
    this.newPlan.set({
      name: '',
      descripcion: '',
      tipoMmebresia: 1,
      creditos: 0,
      precioRegular: 0,
      visibleParaUsuario: true
    });
  }
}
