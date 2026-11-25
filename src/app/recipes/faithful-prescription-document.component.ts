import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { PrescriptionQrComponent } from './prescription-qr.component';
@Component({
  selector: 'app-faithful-prescription-document',
  standalone: true,
  imports: [DatePipe, PrescriptionQrComponent],
  template: ` <div
    #page
    class="original-page"
    [style.height.px]="pageHeight + overflow()"
    [style.background]="design.paperColor"
    aria-label="Diseño del recetario físico original"
  >
    @for (e of design.elements; track $index) {
      <div
        class="original-element"
        [attr.data-original-type]="e.type"
        [style.left.%]="e.x"
        [style.top.px]="top(e)"
        [style.width.%]="e.width"
        [style.height.px]="(pageHeight * e.height) / 100"
        [style.font-family]="e.font"
        [style.font-size.px]="(e.fontSize * width()) / 660"
        [style.font-weight]="e.bold ? '700' : '400'"
        [style.font-style]="e.italic ? 'italic' : 'normal'"
        [style.text-align]="e.align"
        [style.color]="e.color"
        [style.background]="
          e.type === 'line' ? e.color : e.fill === 'none' ? 'transparent' : e.fill
        "
        [style.border-width.px]="e.type === 'line' ? 0 : e.strokeWidth"
        [style.border-color]="e.color"
        [style.border-radius]="e.type === 'ellipse' ? '50%' : null"
      >
        @if (e.type === 'text') {
          <span>{{ e.text }}</span>
        } @else if (e.type === 'image' && image(e)) {
          <img [src]="image(e)" alt="Logo del recetario original" crossorigin="anonymous" />
        }
      </div>
    }
    @for (f of design.fields; track f.key) {
      <section
        class="original-field"
        [attr.data-slot]="f.key"
        [style.left.%]="f.x"
        [style.top.px]="top(f)"
        [style.width.%]="f.width"
        [style.min-height.px]="(pageHeight * f.height) / 100"
        [style.font-family]="f.font"
        [style.font-size.px]="(f.fontSize * width()) / 660"
        [style.text-align]="f.align"
        [style.color]="f.color"
      >
        @switch (f.key) {
          @case ('patientName') {
            {{ patient.fullName }}
          }
          @case ('patientAge') {
            {{ patient.age }}{{ patient.age ? ' años' : '' }}
          }
          @case ('patientBirthDate') {
            {{ patient.birthDate }}
          }
          @case ('issuedAt') {
            {{ prescription.createdAt | date: 'dd/MM/yyyy HH:mm' : '-0600' }}
          }
          @case ('folio') {
            {{ prescription.example ? 'EJEMPLO' : prescription.folio }}
          }
          @case ('medications') {
            <div #medications class="original-medications">
              @for (m of prescription.medications; track $index) {
                <div class="original-medicine">
                  <strong>{{ m.genericName }}</strong>
                  <p>{{ m.pharmaceuticalForm }} {{ m.concentration }} {{ m.presentation }}</p>
                  <p>
                    {{ m.dose }}.
                    @if (m.route) {
                      Vía: {{ m.route }}.
                    }
                    {{ m.frequency }}. {{ m.duration }}.
                  </p>
                </div>
              }
              @if (prescription.instructions) {
                <p class="additional-instructions">{{ prescription.instructions }}</p>
              }
            </div>
          }
          @case ('signature') {
            @if (!prescription.example && author.signatureImage) {
              <img
                class="original-signature"
                [src]="author.signatureImage"
                alt="Firma digitalizada del emisor"
                [style.height.px]="(pageHeight * f.height) / 100"
                crossorigin="anonymous"
              />
            }
          }
          @case ('qr') {
            <app-prescription-qr
              [compact]="true"
              [style.--rx-qr-size]="
                Math.min((width() * f.width) / 100, (pageHeight * f.height) / 100) + 'px'
              "
              [example]="!!prescription.example || !!prescription.draft"
              [payload]="prescription.qrData || ''"
              [integrityHash]="integrityHash"
            />
          }
        }
      </section>
    }
  </div>`,
  styleUrl: './faithful-prescription-document.component.css',
})
export class FaithfulPrescriptionDocumentComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) prescription: any;
  @Input() integrityHash = '';
  @ViewChild('page') page?: ElementRef<HTMLElement>;
  @ViewChild('medications') medications?: ElementRef<HTMLElement>;
  readonly Math = Math;
  readonly width = signal(660);
  readonly overflow = signal(0);
  private observer?: ResizeObserver;
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
  get pageHeight() {
    return (this.width() * this.design.pageHeight) / this.design.pageWidth;
  }
  get medicineField() {
    return this.design.fields.find((f: any) => f.key === 'medications');
  }
  top(e: any) {
    const med = this.medicineField;
    return (
      (this.pageHeight * e.y) / 100 + (med && e.y >= med.y + med.height - 0.1 ? this.overflow() : 0)
    );
  }
  image(e: any) {
    return (
      e.src ||
      (e.role === 'doctorLogo'
        ? this.author.logoUrl
        : e.role === 'officeLogo'
          ? this.office.logoUrl
          : '') ||
      ''
    );
  }
  ngAfterViewInit() {
    this.observer = new ResizeObserver(() => this.measure());
    if (this.page) this.observer.observe(this.page.nativeElement);
    if (this.medications) this.observer.observe(this.medications.nativeElement);
    this.measure();
  }
  private measure() {
    if (!this.page) return;
    this.width.set(this.page.nativeElement.clientWidth || 660);
    const expected = (this.pageHeight * this.medicineField.height) / 100;
    this.overflow.set(
      Math.max(0, Math.ceil((this.medications?.nativeElement.scrollHeight || 0) - expected)),
    );
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
