import { Component, signal, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, MapPin, Phone, Edit2, Zap, Image, Wrench, RotateCcw, PlusCircle, Save } from 'lucide-angular';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { doc, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore';
import { BranchModel } from './miStudio.model'; // Ajusta la ruta a tu modelo

interface MyBikeUI {
  id: string;
  x: number;
  y: number;
  status: 'active' | 'maintenance';
}

@Component({
  selector: 'app-sucursal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DragDropModule],
  templateUrl: './studio.component.html'
})
export class SucursalComponent implements OnInit, OnDestroy {
  readonly icons = { MapPin, Phone, Edit2, Zap, Image, Wrench, RotateCcw, PlusCircle, Save };

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private unsubscribe?: Unsubscribe;
  idBranch: string = 'BEAST-TESISTAN'; // Ajusta según tu ID de sucursal actual

  // Estado reactivo basado exactamente en BranchModel
  studio = signal<BranchModel>({
    address: '',
    createdAt: '',
    email: '',
    galery: [],
    idBranch: '',
    location: { lat: '', lon: '' },
    name: 'Cargando Sucursal...',
    phone: '',
    rating: 0.0,
    scheduler: '',
    schedulerDay: '',
    numberStudents: 0,
    numberCoach: 0,
    typeClasses: [],
    myBikes: [],
    myBikesNumber: 0,
    schedulersStudio: [],
    tolerance: ''
  });

  // Mapeo seguro de las bicis para la interfaz interactiva
  bikesUI = signal<MyBikeUI[]>([]);

  currentImageIndex = 0;

  ngOnInit(): void {
    this.loadBranchRealtime(this.idBranch);
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  loadBranchRealtime(branchId: string) {
    const db = getFirestore();
    const branchRef = doc(db, 'branches', branchId);

    this.unsubscribe = onSnapshot(branchRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BranchModel;
        this.studio.set(data);

        // Mapear myBikes del modelo a la estructura de la UI si existen
        if (data.myBikes && Array.isArray(data.myBikes)) {
          const mappedBikes: MyBikeUI[] = data.myBikes.map((b: any, index: number) => ({
            id: b.id || `B-${index + 1}`,
            x: b.x ?? (15 + (index * 15) % 70),
            y: b.y ?? (20 + Math.floor(index / 5) * 25),
            status: b.status || 'active'
          }));
          this.bikesUI.set(mappedBikes);
        }
      }
    }, (error) => {
      console.error('Error al escuchar la sucursal:', error);
    });
  }

  nextImage() {
    const galery = this.studio().galery;
    if (galery && galery.length > 0) {
      this.currentImageIndex = (this.currentImageIndex + 1) % galery.length;
    }
  }

  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        this.studio.update(prev => ({
          ...prev,
          galery: [...prev.galery, base64Image]
        }));
        this.currentImageIndex = this.studio().galery.length - 1;
      };
      reader.readAsDataURL(file);
    }
  }

  onBikeDropped(event: CdkDragEnd, bikeId: string) {
    if (!this.mapContainer) return;
    const parentRect = this.mapContainer.nativeElement.getBoundingClientRect();
    const elementRect = event.source.getRootElement().getBoundingClientRect();

    const xPercent = ((elementRect.left - parentRect.left) / parentRect.width) * 100;
    const yPercent = ((elementRect.top - parentRect.top) / parentRect.height) * 100;

    this.bikesUI.update(bikes =>
      bikes.map(b => b.id === bikeId ? { ...b, x: xPercent, y: yPercent } : b)
    );

    event.source.reset();
  }

  resetLayout() {
    this.bikesUI.update(bikes =>
      bikes.map((b, index) => ({
        ...b,
        x: 15 + (index * 15) % 70,
        y: 20 + Math.floor(index / 5) * 25,
        status: 'active'
      }))
    );
  }

  addBike() {
    const nextId = `B-${Date.now().toString().slice(-3)}`;
    const newBike: MyBikeUI = { id: nextId, x: 10, y: 10, status: 'active' };
    this.bikesUI.update(bikes => [...bikes, newBike]);
  }

  toggleBikeStatus(bikeId: string) {
    this.bikesUI.update(bikes =>
      bikes.map(b =>
        b.id === bikeId ? { ...b, status: b.status === 'active' ? 'maintenance' : 'active' } : b
      )
    );
  }

  saveLayout() {
    console.log('Layout y datos guardados de la sucursal:', {
      ...this.studio(),
      myBikes: this.bikesUI()
    });
    // Aquí puedes implementar tu servicio o guardado en Firebase con setDoc/updateDoc
  }
}