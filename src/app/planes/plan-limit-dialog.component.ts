import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Users,
  Building2,
  Stethoscope,
  Crown,
  LockKeyhole,
  ArrowRight,
  X,
  ShieldCheck,
  RefreshCw,
  LoaderCircle,
} from 'lucide-angular';
import { BillingService, UsageModule } from './billing.service';
@Component({
  selector: 'app-plan-limit-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './plan-limit-dialog.component.html',
  styleUrl: './plan-limit-dialog.component.css',
})
export class PlanLimitDialogComponent {
  readonly data = inject<{ module: UsageModule }>(MAT_DIALOG_DATA);
  readonly billing = inject(BillingService);
  private ref = inject(MatDialogRef<PlanLimitDialogComponent>);
  private router = inject(Router);
  readonly retrying = signal(false);
  readonly icons = {
    Users,
    Building2,
    Stethoscope,
    Crown,
    LockKeyhole,
    ArrowRight,
    X,
    ShieldCheck,
    RefreshCw,
    LoaderCircle,
  };
  get unavailable() {
    return !this.billing.state() || !!this.billing.error();
  }
  get free() {
    return !this.billing.active();
  }
  get patient() {
    return this.data.module === 'patients';
  }
  get config() {
    return {
      patients: {
        label: 'pacientes',
        singular: 'un paciente',
        title: 'Pacientes registrados',
        icon: Users,
        message: 'Para continuar agregando nuevos pacientes, contrata un plan.',
      },
      offices: {
        label: 'consultorios',
        singular: 'un consultorio',
        title: 'Consultorios de tu cuenta',
        icon: Building2,
        message: 'Para agregar un nuevo consultorio y atender en más espacios, contrata un plan.',
      },
      services: {
        label: 'servicios',
        singular: 'un servicio',
        title: 'Servicios registrados',
        icon: Stethoscope,
        message:
          'Tu cuenta gratuita incluye 3 servicios. Para continuar agregando servicios a tu catálogo, contrata un plan.',
      },
      employees: {
        label: 'empleados',
        singular: 'un empleado',
        title: 'Empleados activos',
        icon: Users,
        message:
          'Tu cuenta gratuita incluye 1 empleado activo. Para ampliar tu equipo y registrar más empleados, contrata un plan.',
      },
    }[this.data.module];
  }
  get description() {
    return this.free
      ? this.config.message
      : 'Amplía tu plan para continuar agregando ' + this.config.label + '.';
  }
  get label() {
    return this.config.label;
  }
  get used() {
    return this.billing.state()?.usage[this.data.module] ?? 0;
  }
  get limit() {
    return this.free
      ? { patients: 5, offices: 1, services: 3, employees: 1 }[this.data.module]
      : (this.billing.state()?.limits[this.data.module] ?? null);
  }
  get percentage() {
    return this.limit ? Math.min(100, Math.max(0, (this.used / this.limit) * 100)) : 100;
  }
  close() {
    this.ref.close();
  }
  viewPlans() {
    this.ref.close();
    void this.router.navigate(['/planes']);
  }
  async retry() {
    if (this.retrying()) return;
    this.retrying.set(true);
    try {
      await this.billing.refresh();
      if (this.billing.canCreate(this.data.module)) this.close();
    } finally {
      this.retrying.set(false);
    }
  }
}
