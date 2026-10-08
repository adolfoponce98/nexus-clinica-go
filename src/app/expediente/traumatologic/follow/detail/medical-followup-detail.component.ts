import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  LucideAngularModule, Activity, ShieldCheck, FileText, Stethoscope,
  ImageIcon, Calendar, Clock, ChevronRight, X, ArrowLeft, Download
} from 'lucide-angular';

@Component({
  selector: 'app-medical-followup-readonly',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: 'medical-followup-detail.component.html'
})
export class MedicalFollowupReadonlyComponent {
  readonly icons = {
    Activity, ShieldCheck, FileText, Stethoscope,
    ImageIcon, Calendar, Clock, ChevronRight, X, ArrowLeft, Download
  };

  private router = inject(Router);

  // Estado para controlar la imagen seleccionada en el visor flotante (Preview)
  selectedImageForPreview = signal<{ name: string; urlMedium: string; urlFullHD: string; type: string } | null>(null);

  // Listado de imágenes de seguimiento (con URL de media resolución y URL de Full HD)
  uploadedImages = signal<Array<{ name: string; urlMedium: string; urlFullHD: string; type: string }>>([
    {
      name: 'RX_Control_Tibia_AP.jpg',
      urlMedium: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600',
      urlFullHD: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=2400',
      type: 'Radiografía'
    },
    {
      name: 'Herida_Quirurgica_PostOp.jpg',
      urlMedium: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600',
      urlFullHD: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=2400',
      type: 'Tejidos Blandos'
    }
  ]);

  volverAlListado() {
    this.router.navigate(['/expediente', 'marketplacelennken@gmail.com']);
  }

  openPreview(img: { name: string; urlMedium: string; urlFullHD: string; type: string }) {
    this.selectedImageForPreview.set(img);
  }

  closePreview() {
    this.selectedImageForPreview.set(null);
  }
}
