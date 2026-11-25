import QRCode from 'qrcode';
import { Component, Input, OnChanges, OnDestroy, signal } from '@angular/core';
export const DEMO_PRESCRIPTION_QR = 'CLINICA_GO_QR_DE_PRUEBA_SIN_VALIDEZ';
@Component({
  selector: 'app-prescription-qr',
  standalone: true,
  template: `<div class="qr-footer" [class.compact]="compact">
    @if (image()) {
      <img
        [src]="image()"
        [alt]="
          example
            ? 'Código QR de prueba sin validez'
            : 'Código QR con identificadores cifrados de expediente y receta'
        "
        width="144"
        height="144"
      />
    }
    @if (!compact) {
      <div class="qr-caption">
        <strong>{{ example ? 'QR de prueba' : 'Identificadores cifrados' }}</strong>
        <p>
          {{
            example
              ? 'Ejemplo de diseño. No identifica un expediente ni una receta real.'
              : payload
                ? 'Expediente y receta vinculados. Consulta autorizada en Clínica Go.'
                : 'Receta histórica sin QR de expediente vinculado.'
          }}
        </p>
        @if (error()) {
          <small role="alert">{{ error() }}</small>
        }
        @if (integrityHash && !example) {
          <code>SHA-256: {{ integrityHash }}</code>
        }
      </div>
    }
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .qr-footer {
        display: flex;
        gap: 10px;
        align-items: center;
        break-inside: avoid;
      }
      .qr-footer img {
        width: var(--rx-qr-size, 144px);
        height: var(--rx-qr-size, 144px);
        max-width: 48%;
        object-fit: contain;
        image-rendering: pixelated;
        background: #fff;
        flex-shrink: 0;
      }
      .qr-footer.compact img {
        max-width: 100%;
        width: var(--rx-qr-size, 144px);
        height: auto;
      }
      .qr-caption {
        min-width: 0;
        font-size: 10px;
        line-height: 1.4;
      }
      .qr-caption strong {
        color: var(--rx-color, #075985);
      }
      .qr-caption p {
        margin: 5px 0;
      }
      .qr-caption code {
        display: block;
        font-size: 8px;
        overflow-wrap: anywhere;
      }
      .qr-caption small {
        color: #b91c1c;
      }
      @media print {
        .qr-footer img {
          width: 112px;
          height: 112px;
        }
        .qr-caption {
          font-size: 9px;
        }
        .qr-caption code {
          font-size: 7px;
        }
      }
    `,
  ],
})
export class PrescriptionQrComponent implements OnChanges, OnDestroy {
  @Input() compact = false;
  @Input() payload = '';
  @Input() example = false;
  @Input() integrityHash = '';
  image = signal('');
  error = signal('');
  private last = '';
  private sequence = 0;
  async ngOnChanges() {
    const data = this.example ? DEMO_PRESCRIPTION_QR : this.payload || '';
    if (data === this.last) return;
    this.last = data;
    const seq = ++this.sequence;
    this.image.set('');
    this.error.set('');
    if (!data) return;
    try {
      const image = await QRCode.toDataURL(data, {
        width: 480,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      });
      if (seq === this.sequence) this.image.set(image);
    } catch {
      if (seq === this.sequence)
        this.error.set('No se pudo generar el QR. Vuelve a abrir la receta.');
    }
  }
  ngOnDestroy() {
    this.sequence++;
  }
}
