import { Component, signal,computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MapPin, Phone, Edit2, Zap, Image, Wrench, RotateCcw, PlusCircle, Save } from 'lucide-angular';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop'; // Librería clave
import { Bike, StudioInfo } from './sucursal.model';

@Component({
  selector: 'app-sucursal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DragDropModule],
  templateUrl: './studio.component.html'
})
export class SucursalComponent {
  // Iconos
  readonly icons = { MapPin, Phone, Edit2, Zap, Image, Wrench, RotateCcw, PlusCircle, Save };

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  // Datos de la Sucursal (Signal para reactividad)
  studio = signal<StudioInfo>({
    name: 'Condesa HQ',
    description: 'The flagship sanctuary for high-intensity rhythmic cycling in Mexico City.',
    address: 'Amsterdam 123, Condesa, CDMX',
    phone: '+52 55 1234 5678',
    images: [ 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80', 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80' ],
    bikes: [
      { id: 'A1', x: 25, y: 15, status: 'active' },
      { id: 'A2', x: 50, y: 15, status: 'active' },
      { id: 'A3', x: 75, y: 15, status: 'maintenance' },
      { id: 'B1', x: 15, y: 40, status: 'active' },
      { id: 'B2', x: 85, y: 40, status: 'active' }
    ]
  });

  // Métricas calculadas
 totalBikes = computed(() => this.studio().bikes.length);
activeBikes = computed(() => this.studio().bikes.filter(b => b.status === 'active').length);
  // --- CAROUSEL DE IMÁGENES ---
  currentImageIndex = 0;

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.studio().images.length;
  }

  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.studio.update(prev => ({
          ...prev,
          images: [...prev.images, e.target.result]
        }));
        this.currentImageIndex = this.studio().images.length - 1; // Ir a la nueva imagen
      };
      reader.readAsDataURL(file);
    }
  }

onBikeDropped(event: CdkDragEnd, bikeId: string) {
  const parentRect = this.mapContainer.nativeElement.getBoundingClientRect();
  const elementRect = event.source.getRootElement().getBoundingClientRect();

  // Calculamos la posición del elemento respecto al padre en porcentaje
  const xPercent = ((elementRect.left - parentRect.left) / parentRect.width) * 100;
  const yPercent = ((elementRect.top - parentRect.top) / parentRect.height) * 100;

  this.studio.update(prev => ({
    ...prev,
    bikes: prev.bikes.map(b => b.id === bikeId ? { ...b, x: xPercent, y: yPercent } : b)
  }));

  // Opcional: Resetear el transform interno de CDK para que no se acumule con el nuevo render
  event.source.reset();
}

resetLayout() {
  // Opción A: Devolver las bicis a posiciones predefinidas (Ejemplo)
  this.studio.update(prev => ({
    ...prev,
    bikes: [
      { id: 'A1', x: 25, y: 15, status: 'active' },
      { id: 'A2', x: 50, y: 15, status: 'active' },
      { id: 'A3', x: 75, y: 15, status: 'maintenance' },
      { id: 'B1', x: 15, y: 40, status: 'active' },
      { id: 'B2', x: 85, y: 40, status: 'active' }
    ]
  }));

  // Opción B: Si prefieres que simplemente limpie todas las bicis:
  // this.studio.update(prev => ({ ...prev, bikes: [] }));
}

addBike() {
  // 1. Usar un ID basado en timestamp para evitar colisiones si borras bicis
  const nextId = `C${Date.now().toString().slice(-3)}`;

  // 2. Posición inicial
  const newBike: Bike = { id: nextId, x: 10, y: 10, status: 'active' };

  // 3. Actualizar la señal
  this.studio.update(prev => ({
    ...prev,
    bikes: [...prev.bikes, newBike]
  }));
}
  toggleBikeStatus(bikeId: string) {
    this.studio.update(prev => ({
      ...prev,
      bikes: prev.bikes.map(b =>
        b.id === bikeId ? { ...b, status: b.status === 'active' ? 'maintenance' : 'active' } : b
      )
    }));
  }

  saveLayout() {
    console.log('Layout guardado:', this.studio().bikes);
    // Aquí iría tu llamada al backend para guardar las posiciones finales
  }
}
