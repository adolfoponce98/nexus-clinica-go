import { PermissionDirective } from '../auth/permission.directive';
import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicApiService } from './clinic-api.service';
import { API_URLS } from '../config/api-urls';

@Component({
  selector: 'app-appointment-billing',
  standalone: true,
  imports: [PermissionDirective, CommonModule, FormsModule],
  template: ` <section
    class="p-3 border rounded-2xl space-y-3 text-xs"
    style="border-color:var(--border-color);background:var(--bg-primary)"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="font-bold">Costo y pago de la consulta</p>
        <p style="color:var(--text-muted)">
          Cobrado: {{ appointment?.amountPaid ?? 0 | currency: 'MXN' : 'symbol' : '1.2-2' }}
        </p>
      </div>
      <button
        type="button"
        (click)="begin()"
        class="px-3 py-2 rounded-xl bg-blue-600 text-white font-bold"
        appPermission="finances:write"
      >
        Asignar costo
      </button>
    </div>
    @if (appointment?.finalCost !== null && appointment?.finalCost !== undefined) {
      <p>Costo final: {{ appointment.finalCost | currency: 'MXN' : 'symbol' : '1.2-2' }}</p>
    } @else if (appointment?.quotedCost !== null && appointment?.quotedCost !== undefined) {
      <p>
        Precio de catálogo: {{ appointment.quotedCost | currency: 'MXN' : 'symbol' : '1.2-2' }} ·
        pendiente de costo final
      </p>
    } @else {
      <p style="color:var(--text-muted)">Costo pendiente de asignar</p>
    }
    @if (editing()) {
      <div class="grid grid-cols-2 gap-2">
        <label
          >Costo final (MXN)<input
            type="number"
            min="0"
            max="100000000"
            step="0.01"
            [(ngModel)]="cost"
            class="block w-full mt-1 px-2 py-2 border rounded-xl"
            style="background:var(--bg-secondary);border-color:var(--border-color)"
            appPermission="finances:write" /></label
        ><label
          >Monto pagado total (MXN)<input
            type="number"
            min="0"
            max="100000000"
            step="0.01"
            [(ngModel)]="paid"
            class="block w-full mt-1 px-2 py-2 border rounded-xl"
            style="background:var(--bg-secondary);border-color:var(--border-color)"
            appPermission="finances:write"
        /></label>
      </div>
      <p style="color:var(--text-muted)">
        Registra el total pagado hasta ahora, no un abono adicional. El costo no se cuenta como
        ingreso automáticamente.
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          [appPermissionDisabled]="saving()"
          (click)="save()"
          class="px-3 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50"
          appPermission="finances:write"
        >
          {{ saving() ? 'Guardando…' : 'Guardar costo y pago' }}</button
        ><button
          type="button"
          [appPermissionDisabled]="saving()"
          (click)="editing.set(false)"
          class="px-3 py-2 border rounded-xl"
          appPermission="finances:write"
        >
          Cancelar
        </button>
      </div>
    }
    @if (error()) {
      <p role="alert" class="text-rose-500">{{ error() }}</p>
    }
    @if (success()) {
      <p role="status" class="text-emerald-500">Costo y pago guardados</p>
    }
  </section>`,
})
export class AppointmentBillingComponent {
  @Input({ required: true }) appointment: any;
  @Output() updated = new EventEmitter<any>();
  private readonly api = inject(ClinicApiService);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly success = signal(false);
  cost: number | null = null;
  paid: number | null = 0;
  begin(): void {
    this.cost = this.appointment.finalCost ?? this.appointment.quotedCost ?? null;
    this.paid = this.appointment.amountPaid ?? 0;
    this.editing.set(true);
    this.error.set('');
    this.success.set(false);
  }
  async save(): Promise<void> {
    if (this.saving()) return;
    if (
      ![this.cost, this.paid].every(
        (v) =>
          v !== null &&
          Number.isFinite(Number(v)) &&
          Number(v) >= 0 &&
          Number(v) <= 100000000 &&
          Math.abs(Number(v) * 100 - Math.round(Number(v) * 100)) < 0.00001,
      )
    ) {
      this.error.set('Indica ambos montos válidos con hasta dos decimales.');
      return;
    }
    const branch = this.api.branchId();
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await this.api.post(API_URLS.RECORD_APPOINTMENT_VISIT, {
        idConsultorio: branch,
        appointmentId: this.appointment.appointmentId,
        date: this.appointment.date,
        time: this.appointment.time,
        operation: 'billing',
        expectedVersion: this.appointment.version,
        finalCost: Number(this.cost),
        amountPaid: Number(this.paid),
      });
      this.api.mergeAppointment(result.appointment, branch);
      this.updated.emit(result.appointment);
      this.editing.set(false);
      this.success.set(true);
    } catch (error: any) {
      this.error.set(error.message || 'No se pudo guardar');
    } finally {
      this.saving.set(false);
    }
  }
}
