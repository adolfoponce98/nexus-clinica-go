import { Component, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule, PenLine, ImagePlus, X } from 'lucide-angular';
import { ClinicalIdentityComponent } from './clinical-identity.component';
import { PrescriptionBrandingComponent } from './prescription-branding.component';
export type ClinicalAssetKind = 'signature' | 'logo';
@Component({
  selector: 'app-clinical-asset-dialog',
  standalone: true,
  imports: [ClinicalIdentityComponent, PrescriptionBrandingComponent, LucideAngularModule],
  template: `
    <section class="asset-dialog">
      <header>
        <span class="asset-icon"
          ><lucide-icon [img]="data.kind === 'signature' ? icons.PenLine : icons.ImagePlus"
        /></span>
        <div>
          <span class="kicker">NEXUS IA · IDENTIDAD PROFESIONAL</span>
          <h2>{{ data.kind === 'signature' ? 'Firma digitalizada' : 'Digitalizar logo' }}</h2>
          <p>
            {{
              data.kind === 'signature'
                ? 'La misma firma que utilizas en tu perfil y documentos.'
                : 'El logo del doctor o consultorio, listo para tus recetas.'
            }}
          </p>
        </div>
        <button
          type="button"
          class="close"
          (click)="close()"
          [disabled]="pending"
          aria-label="Cerrar diálogo"
        >
          <lucide-icon [img]="icons.X" />
        </button>
      </header>
      <div class="asset-body">
        @if (data.kind === 'signature') {
          <app-clinical-identity mode="signature" [showHeading]="false" />
        } @else {
          <app-prescription-branding />
        }
      </div>
    </section>
  `,
  styleUrl: './clinical-asset-dialog.component.css',
})
export class ClinicalAssetDialogComponent {
  readonly data = inject<{ kind: ClinicalAssetKind }>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ClinicalAssetDialogComponent>);
  readonly icons = { PenLine, ImagePlus, X };
  @ViewChild(ClinicalIdentityComponent) signature?: ClinicalIdentityComponent;
  @ViewChild(PrescriptionBrandingComponent) logo?: PrescriptionBrandingComponent;
  get pending() {
    return !!(
      this.signature?.busy() ||
      this.signature?.imageBusy() ||
      this.logo?.loading() ||
      this.logo?.preparing() ||
      this.logo?.saving() ||
      this.logo?.uploading()
    );
  }
  close() {
    if (!this.pending) this.ref.close();
  }
}
