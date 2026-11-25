import { FaithfulPrescriptionDocumentComponent } from './faithful-prescription-document.component';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrescriptionQrComponent } from './prescription-qr.component';
@Component({
  selector: 'app-physical-prescription-document',
  standalone: true,
  imports: [CommonModule, PrescriptionQrComponent, FaithfulPrescriptionDocumentComponent],
  template: `
    @if (design.version === 2) {
      <app-faithful-prescription-document
        [prescription]="prescription"
        [integrityHash]="integrityHash"
      />
    } @else {
      <div
        class="physical-paper"
        [style.color]="design.color"
        [style.font-family]="design.font === 'serif' ? 'Georgia,serif' : 'Roboto,Arial,sans-serif'"
        [style.border]="
          design.border === 'none'
            ? 'none'
            : design.border === 'double'
              ? '3px double ' + design.color
              : '1px solid ' + design.color
        "
      >
        @if (design.watermark && (author.logoUrl || office.logoUrl)) {
          <img
            class="physical-watermark"
            [src]="author.logoUrl || office.logoUrl"
            alt=""
            crossorigin="anonymous"
          />
        }
        @for (b of design.blocks; track b.key) {
          <section
            [attr.data-slot]="b.key"
            [style.grid-row]="b.row"
            [style.grid-column]="b.column + ' / span ' + b.span"
            [style.text-align]="b.align"
          >
            @switch (b.key) {
              @case ('header') {
                <div
                  class="physical-header"
                  [style.justify-content]="
                    b.align === 'center'
                      ? 'center'
                      : b.align === 'right'
                        ? 'flex-end'
                        : 'flex-start'
                  "
                >
                  @if (design.doctorLogo && author.logoUrl) {
                    <img
                      class="doctor-logo"
                      [src]="author.logoUrl"
                      alt="Logo del doctor"
                      crossorigin="anonymous"
                    />
                  }
                  <div>
                    <h1>{{ author.fullName || 'Nombre del médico pendiente' }}</h1>
                    <p>{{ author.profession }} · {{ author.specialty }}</p>
                    <p>{{ author.educationalInstitution }}</p>
                    <p>
                      Cédula profesional: {{ author.professionalLicense || 'Pendiente' }}
                      @if (author.specialtyLicense) {
                        · Especialidad: {{ author.specialtyLicense }}
                      }
                    </p>
                  </div>
                  @if (design.officeLogo && office.logoUrl) {
                    <img
                      class="office-logo"
                      [src]="office.logoUrl"
                      alt="Logo del consultorio"
                      crossorigin="anonymous"
                    />
                  }
                </div>
              }
              @case ('office') {
                <div class="rx-office">
                  <strong>{{ office.name }}</strong>
                  <p>{{ office.address }}</p>
                  <p>
                    Tel. {{ office.phone }}
                    @if (office.email) {
                      · {{ office.email }}
                    }
                  </p>
                </div>
              }
              @case ('emission') {
                <div class="rx-folio">
                  <span
                    ><small>Folio</small><strong>{{ prescription.folio }}</strong></span
                  ><span
                    ><small>Fecha y hora</small
                    ><strong>{{
                      prescription.createdAt | date: 'dd/MM/yyyy HH:mm' : '-0600'
                    }}</strong></span
                  >
                </div>
              }
              @case ('patient') {
                <div class="rx-patient">
                  <div>
                    <small>PACIENTE</small>
                    <h2>{{ patient.fullName }}</h2>
                  </div>
                  <div>
                    <small>{{ patient.birthDate ? 'FECHA DE NACIMIENTO' : 'EDAD' }}</small
                    ><strong>{{ patient.birthDate || patient.age + ' años' }}</strong>
                  </div>
                </div>
              }
              @case ('medications') {
                <div class="rx-treatment">
                  <h2>℞ Prescripción médica</h2>
                  @for (m of prescription.medications; track $index) {
                    <div class="rx-medicine">
                      <span class="rx-number">{{ $index + 1 }}</span>
                      <div class="rx-medicine-content">
                        <h3>{{ m.genericName }}</h3>
                        <p>{{ m.pharmaceuticalForm }} {{ m.concentration }} {{ m.presentation }}</p>
                        <p class="rx-instruction">
                          <strong>Dosis:</strong> {{ m.dose }}.
                          @if (m.route) {
                            <strong>Vía:</strong> {{ m.route }}.
                          }
                          <strong>Frecuencia:</strong> {{ m.frequency }}. <strong>Duración:</strong>
                          {{ m.duration }}.
                        </p>
                      </div>
                    </div>
                  }
                  @if (prescription.instructions) {
                    <div class="rx-extra">
                      <h3>Indicaciones adicionales</h3>
                      <p>{{ prescription.instructions }}</p>
                    </div>
                  }
                </div>
              }
              @case ('signature') {
                <div class="rx-signature">
                  @if (author.signatureImage && !prescription.example) {
                    <img
                      [src]="author.signatureImage"
                      alt="Firma digitalizada del emisor"
                      crossorigin="anonymous"
                    />
                  } @else {
                    <div class="rx-signature-space"></div>
                  }
                  <span>{{ author.fullName }}</span
                  ><small>{{
                    prescription.example
                      ? 'Firma del profesional al emitir'
                      : 'Firma digitalizada vinculada al emisor'
                  }}</small>
                </div>
              }
              @case ('qr') {
                <div class="rx-verification">
                  <app-prescription-qr
                    [example]="!!prescription.example || !!prescription.draft"
                    [payload]="prescription.qrData || ''"
                    [integrityHash]="integrityHash"
                  />
                </div>
              }
            }
          </section>
        }
      </div>
      <p class="rx-legal">
        {{
          prescription.example
            ? 'EJEMPLO SIN VALIDEZ · No es una receta emitida.'
            : 'Receta general. Este formato no sustituye recetarios especiales ni autorizaciones de COFEPRIS. Verifica el registro original con su folio o QR.'
        }}
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .physical-paper {
      display: grid;
      position: relative;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 18px 14px;
      padding: 18px;
      min-height: 700px;
    }
    .physical-paper > section {
      min-width: 0;
      z-index: 1;
      overflow-wrap: anywhere;
    }
    .physical-header {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .physical-header h1 {
      font-size: 22px;
      margin: 0 0 5px;
      color: inherit;
    }
    .physical-header p {
      font-size: 11px;
      margin: 3px 0;
    }
    .doctor-logo {
      width: 80px;
      height: 80px;
      object-fit: contain;
    }
    .office-logo {
      width: 55px;
      height: 55px;
      object-fit: contain;
      margin-left: auto;
    }
    .physical-watermark {
      position: absolute;
      left: 20%;
      top: 30%;
      width: 60%;
      height: 35%;
      object-fit: contain;
      opacity: 0.07;
      pointer-events: none;
    }
    .rx-verification {
      border: 0;
    }
    .rx-folio {
      flex-wrap: wrap;
      gap: 10px;
    }
    .rx-signature {
      min-width: 0;
    }
  `,
})
export class PhysicalPrescriptionDocumentComponent {
  @Input({ required: true }) prescription: any;
  @Input() integrityHash = '';
  get design() {
    return this.prescription.customTemplate.design;
  }
  get author() {
    return this.prescription.header?.author || {};
  }
  get office() {
    return this.prescription.header?.office || {};
  }
  get patient() {
    return this.prescription.header?.patient || {};
  }
}
