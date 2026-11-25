import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PrescriptionComposerComponent } from './prescription-composer.component';
export interface PrescriptionContext {
  patientId: string;
  attachToConsultation?: boolean;
  followUpId?: string;
}
@Injectable({ providedIn: 'root' })
export class PrescriptionComposerService {
  private dialogs = inject(MatDialog);
  open(data: PrescriptionContext) {
    return this.dialogs
      .open(PrescriptionComposerComponent, {
        data,
        width: '1500px',
        maxWidth: '96vw',
        height: '94vh',
        maxHeight: '96vh',
        autoFocus: false,
        disableClose: true,
        panelClass: 'prescription-composer-dialog',
      })
      .afterClosed();
  }
}
