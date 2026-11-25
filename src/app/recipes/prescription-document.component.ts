import { PhysicalPrescriptionDocumentComponent } from './physical-prescription-document.component';
import { PrescriptionQrComponent } from './prescription-qr.component';
import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { prescriptionTemplate } from './prescription-templates';
@Component({
  selector: 'app-prescription-document',
  standalone: true,
  imports: [CommonModule, PrescriptionQrComponent, PhysicalPrescriptionDocumentComponent],
  templateUrl: './prescription-document.component.html',
  styleUrl: './prescription-document.component.css',
})
export class PrescriptionDocumentComponent implements AfterViewInit, OnDestroy {
  @ViewChild('paperFrame') frame?: ElementRef<HTMLElement>;
  @ViewChild('paperSheet') sheet?: ElementRef<HTMLElement>;
  readonly scale = signal(1);
  readonly previewHeight = signal(0);
  private observer?: ResizeObserver;
  get paperWidth() {
    return this.prescription?.orientation === 'landscape' ? 930 : 660;
  }
  ngAfterViewInit() {
    this.observer = new ResizeObserver(() => this.fitPreview());
    this.observer.observe(this.frame!.nativeElement);
    this.observer.observe(this.sheet!.nativeElement);
    this.fitPreview();
  }
  ngOnDestroy() {
    this.observer?.disconnect();
  }
  private fitPreview() {
    const frame = this.frame?.nativeElement,
      sheet = this.sheet?.nativeElement;
    if (!frame || !sheet || !frame.clientWidth) return;
    const scale = Math.min(1, frame.clientWidth / this.paperWidth);
    this.scale.set(scale);
    this.previewHeight.set(Math.ceil(sheet.offsetHeight * scale));
  }

  @Input({ required: true }) prescription: any;
  @Input() integrityHash = '';
  private failedLogo = '';
  private failedDoctorLogo = '';
  private failedOfficeLogo = '';
  get doctorLogoUrl() {
    const url = this.author.prescriptionLogoUrl || this.author.logoUrl || '';
    return url === this.failedDoctorLogo ? '' : url;
  }
  get officeLogoUrl() {
    const url = this.template.officeLogo ? this.office.logoUrl || this.office.logo || '' : '';
    return url === this.failedOfficeLogo ? '' : url;
  }
  hideHeaderLogo(target: 'doctor' | 'office') {
    if (target === 'doctor') this.failedDoctorLogo = this.doctorLogoUrl;
    else this.failedOfficeLogo = this.officeLogoUrl;
  }
  get watermarkUrl() {
    if (!this.template.watermark) return '';
    const url = this.officeLogoUrl || this.doctorLogoUrl;
    return url === this.failedLogo ? '' : url;
  }
  hideWatermark() {
    this.failedLogo = this.watermarkUrl;
  }
  get template() {
    return prescriptionTemplate(this.prescription?.templateId);
  }
  get author() {
    return this.prescription?.header?.author || {};
  }
  get office() {
    return this.prescription?.header?.office || {};
  }
  get patient() {
    return this.prescription?.header?.patient || {};
  }
  get initials() {
    return String(this.author.fullName || 'CG')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((v) => v[0])
      .join('');
  }
}
