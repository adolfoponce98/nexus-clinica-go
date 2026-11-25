import { Component, Input } from '@angular/core';
import { PrescriptionTemplate } from './prescription-templates';
@Component({
  selector: 'app-prescription-thumbnail',
  standalone: true,
  template: `<div
    class="mini-paper"
    [attr.data-layout]="template.layout"
    [class.landscape]="orientation === 'landscape'"
    aria-hidden="true"
  >
    <div class="mini-heading">
      <span class="mini-cross">
        @if (doctorLogoUrl) {
          <img class="mini-doctor-logo" [src]="doctorLogoUrl" alt="" />
        } @else {
          ✚
        }
      </span>
      <div><b></b><i></i><i></i></div>
      <span class="mini-mark">
        @if (template.officeLogo && officeLogoUrl) {
          <img class="mini-office-logo" [src]="officeLogoUrl" alt="" />
        } @else {
          ℞
        }
      </span>
    </div>
    @if (template.watermark && (doctorLogoUrl || (template.officeLogo && officeLogoUrl))) {
      <img
        class="mini-watermark"
        [src]="template.officeLogo && officeLogoUrl ? officeLogoUrl : doctorLogoUrl"
        alt=""
      />
    }
    <div class="mini-meta"></div>
    <div class="mini-patient"></div>
    <div class="mini-rx">℞</div>
    <div class="mini-lines"><i></i><i></i><i></i><i></i></div>
    <div class="mini-footer">
      <div class="mini-signature"></div>
      <div class="mini-qr"></div>
    </div>
  </div>`,
  styleUrl: './prescription-thumbnail.component.css',
})
export class PrescriptionThumbnailComponent {
  @Input() doctorLogoUrl = '';
  @Input() officeLogoUrl = '';
  @Input() orientation = 'portrait';
  @Input({ required: true }) template!: PrescriptionTemplate;
}
