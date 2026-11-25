import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BillingService, UsageModule } from './billing.service';
import { PlanLimitDialogComponent } from './plan-limit-dialog.component';
@Injectable({ providedIn: 'root' })
export class CreationAccessService {
  private billing = inject(BillingService);
  private dialogs = inject(MatDialog);
  private opened?: MatDialogRef<PlanLimitDialogComponent>;
  allow(module: UsageModule): boolean {
    if (this.billing.canCreate(module)) return true;
    if (!this.opened) {
      const dialog = this.dialogs.open(PlanLimitDialogComponent, {
        data: { module },
        width: '560px',
        maxWidth: '95vw',
        maxHeight: '92dvh',
        panelClass: 'nexus-asset-dialog',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        ariaLabel:
          'Límite de ' +
          {
            patients: 'pacientes',
            offices: 'consultorios',
            services: 'servicios',
            employees: 'empleados',
          }[module] +
          ' de tu plan',
      });
      this.opened = dialog;
      dialog.afterClosed().subscribe(() => {
        if (this.opened === dialog) this.opened = undefined;
      });
    }
    return false;
  }
}
