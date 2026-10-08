import { Component, signal, computed, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  LucideAngularModule, Building2, MapPin, Phone, Mail, Image, Search,
  ChevronLeft, ChevronRight, PlusCircle, Save, Store, DollarSign, Users,
  Layers, Map, CheckCircle2, AlertCircle, ArrowLeft, UserPlus, Trash2,
  Smartphone, Globe, Briefcase, Eye, EyeOff, Wrench, RotateCcw, Armchair,
  DoorOpen, Waves, Columns3, Bike, Settings, Table, Disc, Square, Dumbbell,
  Volume2, Fan, LogIn, LogOut, GlassWater
} from 'lucide-angular';
import { CdkDragEnd, DragDropModule } from '@angular/cdk/drag-drop';
import { doc, onSnapshot, Unsubscribe, getFirestore, setDoc } from 'firebase/firestore';

interface StudioElementUI {
  id: string;
  type: 'bike' | 'furniture';
  subType?: string;
  label: string;
  gridX: number;
  gridY: number;
  status: 'active' | 'maintenance' | 'inactive';
}

interface SubBranchDetail {
  id: string;
  name: string;
  category: string;
  activeStudents: number;
  appBookings: number;
  webBookings: number;
  monthlyRevenue: number;
  coachesCount: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface BranchMatrix {
  id: string;
  name: string;
  brand: string;
  category: string;
  email: string;
  phone: string;
  membershipType: string;
  address: {
    street: string;
    extNumber: string;
    intNumber?: string;
    neighborhood: string;
    state: string;
    zipCode: string;
  };
  location: { lat: string; lon: string };
  logo: string;
  activeMembers: number;
  monthlyCost: number;
  monthlyRevenue: number;
  isActive: boolean;
  subBranches: SubBranchDetail[];
  adminUsers: AdminUser[];
  galery?: string[];
  tolerance?: string;
  scheduler?: string;
  schedulerDay?: string;
  rating?: number;
  numberStudents?: number;
  numberCoach?: number;
}

@Component({
  selector: 'app-studios-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, DragDropModule],
  templateUrl: './studio.component.html'
})
export class SucursalComponent implements OnDestroy {
  readonly icons = {
    Building2, MapPin, Phone, Mail, Image, Search, ChevronLeft,
    ChevronRight, PlusCircle, Save, Store, DollarSign, Users, Layers, Map,
    CheckCircle2, AlertCircle, ArrowLeft, UserPlus, Trash2, Smartphone, Globe,
    Briefcase, Eye, EyeOff, Wrench, RotateCcw, Armchair, DoorOpen, Waves,
    Columns3, Bike, Settings, Table, Disc, Square, Dumbbell, Volume2, Fan,
    LogIn, LogOut, GlassWater
  };

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  matrixForm: FormGroup;
  adminForm: FormGroup;

  categories = ['Pilates', 'Gym / Musculación', 'Indoor Cycling', 'Ballet / Barre', 'Yoga', 'Functional Training'];
  membershipTypes = ['Enterprise Global ($10,000/mes)', 'Business Pro ($6,500/mes)', 'Standard Studio ($3,500/mes)'];

  selectedStudio = signal<BranchMatrix | null>(null);
  showPassword = signal<boolean>(false);
  currentImageIndex = 0;

  // Grilla para el Floor Plan Editor
  gridCols = signal<number>(10);
  gridRows = signal<number>(4);
  customColsInput: number = 10;
  customRowsInput: number = 4;
  elementsUI = signal<StudioElementUI[]>([]);
  selectedBikeForModal = signal<StudioElementUI | null>(null);

  private unsubscribeStage?: Unsubscribe;

  studiosList = signal<BranchMatrix[]>([
    {
      id: 'BEAST-TESISTAN',
      name: 'OmniStudio Tesistán Central',
      brand: 'Beast Studio',
      category: 'Indoor Cycling',
      email: 'tesistan@omnistudio.com',
      phone: '+52 33 1234 5678',
      membershipType: 'Enterprise Global ($10,000/mes)',
      address: { street: 'Av. Juan Gil Preciado', extNumber: '1500', intNumber: 'Local 4', neighborhood: 'Tesistán', state: 'Jalisco', zipCode: '45200' },
      location: { lat: '20.7891', lon: '-103.4512' },
      logo: 'https://ui-avatars.com/api/?name=Beast+Tesistan&background=1e1b4b&color=93c5fd',
      activeMembers: 340,
      monthlyCost: 28000,
      monthlyRevenue: 145000,
      isActive: true,
      galery: [],
      subBranches: [
        { id: 'SUB-01', name: 'Tesistán Norte', category: 'Pilates', activeStudents: 120, appBookings: 85, webBookings: 35, monthlyRevenue: 55000, coachesCount: 4 },
        { id: 'SUB-02', name: 'Plaza Galerías Studio', category: 'Indoor Cycling', activeStudents: 220, appBookings: 160, webBookings: 60, monthlyRevenue: 90000, coachesCount: 7 }
      ],
      adminUsers: [
        { id: 'USR-1', fullName: 'María González', email: 'maria.admin@beast.com', role: 'ADMIN_MATRIZ' }
      ]
    }
  ]);

  searchTerm = signal('');
  selectedStateFilter = signal('');
  selectedCategoryFilter = signal('');
  selectedStatusFilter = signal<string>('all');
  sortBy = signal<string>('revenueDesc');

  currentPage = signal(1);
  pageSize = 10;

  constructor(private fb: FormBuilder) {
    this.matrixForm = this.fb.group({
      brand: ['', Validators.required],
      name: ['', Validators.required],
      category: ['', Validators.required],
      membershipType: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      logo: [''],
      street: ['', Validators.required],
      extNumber: ['', Validators.required],
      intNumber: [''],
      neighborhood: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      lat: ['20.6597'],
      lon: ['-103.3496']
    });

    this.adminForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribeStage) this.unsubscribeStage();
  }

  filteredStudios = computed(() => {
    let list = this.studiosList();
    const term = this.searchTerm().toLowerCase();
    if (term) list = list.filter(s => s.name.toLowerCase().includes(term) || s.brand.toLowerCase().includes(term));
    if (this.selectedStateFilter()) list = list.filter(s => s.address.state === this.selectedStateFilter());
    if (this.selectedCategoryFilter()) list = list.filter(s => s.category === this.selectedCategoryFilter());
    if (this.selectedStatusFilter() === 'active') list = list.filter(s => s.isActive);
    else if (this.selectedStatusFilter() === 'inactive') list = list.filter(s => !s.isActive);

    return [...list].sort((a, b) => {
      if (this.sortBy() === 'revenueDesc') return b.monthlyRevenue - a.monthlyRevenue;
      if (this.sortBy() === 'revenueAsc') return a.monthlyRevenue - b.monthlyRevenue;
      return a.name.localeCompare(b.name);
    });
  });

  paginatedStudios = computed(() => {
    const list = this.filteredStudios();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredStudios().length / this.pageSize) || 1);

  nextPage() { if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1); }
  prevPage() { if (this.currentPage() > 1) this.currentPage.update(p => p - 1); }

  onSubmitMatrix() {
    if (this.matrixForm.invalid) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }
    const val = this.matrixForm.value;
    const newId = `MX-${Date.now().toString().slice(-4)}`;
    const newStudio: BranchMatrix = {
      id: newId,
      name: val.name,
      brand: val.brand,
      category: val.category,
      email: val.email,
      phone: val.phone,
      membershipType: val.membershipType,
      address: { street: val.street, extNumber: val.extNumber, intNumber: val.intNumber, neighborhood: val.neighborhood, state: val.state, zipCode: val.zipCode },
      location: { lat: val.lat, lon: val.lon },
      logo: val.logo || `https://ui-avatars.com/api/?name=${val.brand}&background=1e1b4b&color=93c5fd`,
      activeMembers: 0,
      monthlyCost: 5000,
      monthlyRevenue: 0,
      isActive: true,
      galery: [],
      subBranches: [],
      adminUsers: []
    };
    this.studiosList.update(list => [newStudio, ...list]);
    this.matrixForm.reset({ lat: '20.6597', lon: '-103.3496' });
    alert('¡Sucursal Matriz dada de alta exitosamente!');
  }

  selectStudio(studio: BranchMatrix) {
    this.selectedStudio.set(studio);
    this.loadStageRealtime(studio.id);
  }

  goBackToList() {
    if (this.unsubscribeStage) this.unsubscribeStage();
    this.selectedStudio.set(null);
  }

  // Firebase Realtime para el Floor Plan de la Sucursal Seleccionada
  loadStageRealtime(branchId: string) {
    const db = getFirestore();
    const stageRef = doc(db, 'stagesSucursals', branchId);

    this.unsubscribeStage = onSnapshot(stageRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        if (data.gridConfig) {
          const cols = data.gridConfig.cols || 10;
          const rows = data.gridConfig.rows || 4;
          this.gridCols.set(cols);
          this.gridRows.set(rows);
          this.customColsInput = cols;
          this.customRowsInput = rows;
        }
        if (data.myBikes && Array.isArray(data.myBikes) && data.myBikes.length > 0) {
          const mappedElements: StudioElementUI[] = data.myBikes.map((b: any, index: number) => ({
            id: b.id || `B-${index + 1}`,
            type: b.type || 'bike',
            subType: b.subType,
            label: b.label || b.id || `B-${index + 1}`,
            gridX: b.gridX ?? (index % this.gridCols()),
            gridY: b.gridY ?? Math.floor(index / this.gridCols()),
            status: b.status || 'active'
          }));
          this.elementsUI.set(mappedElements);
        } else {
          this.generateDefaultBikes();
        }
      } else {
        this.generateDefaultBikes();
      }
    });
  }

  generateDefaultBikes() {
    const defaultElements: StudioElementUI[] = [];
    for (let i = 1; i <= 10; i++) {
      defaultElements.push({
        id: `B-${i}`,
        type: 'bike',
        label: `B-${i}`,
        gridX: (i - 1) % this.gridCols(),
        gridY: Math.floor((i - 1) / this.gridCols()),
        status: 'active'
      });
    }
    this.elementsUI.set(defaultElements);
  }

  onElementDropped(event: CdkDragEnd, elementId: string) {
    if (!this.mapContainer) return;
    const parentRect = this.mapContainer.nativeElement.getBoundingClientRect();
    const elementRect = event.source.getRootElement().getBoundingClientRect();

    const cellWidth = parentRect.width / this.gridCols();
    const cellHeight = parentRect.height / this.gridRows();

    const relativeX = elementRect.left - parentRect.left + (cellWidth / 2);
    const relativeY = elementRect.top - parentRect.top + (cellHeight / 2);

    let newGridX = Math.floor(relativeX / cellWidth);
    let newGridY = Math.floor(relativeY / cellHeight);

    newGridX = Math.max(0, Math.min(newGridX, this.gridCols() - 1));
    newGridY = Math.max(0, Math.min(newGridY, this.gridRows() - 1));

    this.elementsUI.update(elems =>
      elems.map(el => el.id === elementId ? { ...el, gridX: newGridX, gridY: newGridY } : el)
    );

    event.source.reset();
  }

  addBike() {
    const bikeCount = this.elementsUI().filter(e => e.type === 'bike').length + 1;
    const nextId = `B-${bikeCount}`;
    const newBike: StudioElementUI = { id: nextId, type: 'bike', label: nextId, gridX: 0, gridY: 0, status: 'active' };
    this.elementsUI.update(elems => [...elems, newBike]);
  }

  addFurniture(subType: string, label: string) {
    const newFurniture: StudioElementUI = {
      id: `F-${Date.now().toString().slice(-4)}`,
      type: 'furniture',
      subType,
      label,
      gridX: 0,
      gridY: 0,
      status: 'active'
    };
    this.elementsUI.update(elems => [...elems, newFurniture]);
  }

  getFurnitureIcon(subType?: string) {
    switch (subType) {
      case 'stage': return this.icons.Columns3;
      case 'bano': return this.icons.Waves;
      case 'recepcion': return this.icons.DoorOpen;
      case 'mesa': return this.icons.Table;
      case 'cojin': return this.icons.Disc;
      case 'sillon': return this.icons.Armchair;
      case 'silla': return this.icons.Square;
      case 'mancuernas': return this.icons.Dumbbell;
      case 'audio': return this.icons.Volume2;
      case 'ventilador': return this.icons.Fan;
      case 'entrada': return this.icons.LogIn;
      case 'salida': return this.icons.LogOut;
      case 'hidratacion': return this.icons.GlassWater;
      default: return this.icons.Armchair;
    }
  }

  removeElement(id: string) {
    this.elementsUI.update(elems => elems.filter(e => e.id !== id));
    this.selectedBikeForModal.set(null);
  }

  resetLayout() { this.generateDefaultBikes(); }

  applyCustomGrid() {
    const c = Number(this.customColsInput);
    const r = Number(this.customRowsInput);
    if (c > 0 && r > 0) {
      this.gridCols.set(c);
      this.gridRows.set(r);
    }
  }

  openBikeModal(element: StudioElementUI, event: MouseEvent) {
    event.stopPropagation();
    if (element.type === 'bike') this.selectedBikeForModal.set({ ...element });
  }

  updateBikeStatusFromModal(newStatus: 'active' | 'maintenance' | 'inactive') {
    const target = this.selectedBikeForModal();
    if (!target) return;
    this.elementsUI.update(elems => elems.map(e => e.id === target.id ? { ...e, status: newStatus } : e));
    this.selectedBikeForModal.set(null);
  }

  async saveStageLayout() {
    const studio = this.selectedStudio();
    if (!studio) return;
    try {
      const db = getFirestore();
      const stageRef = doc(db, 'stagesSucursals', studio.id);
      const bikesData = this.elementsUI();
      const payload = {
        idBranch: studio.id,
        myBikes: bikesData,
        gridConfig: { cols: this.gridCols(), rows: this.gridRows() },
        updatedAt: new Date().toISOString()
      };
      await setDoc(stageRef, payload, { merge: true });
      alert('¡Layout y croquis guardados exitosamente!');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el layout.');
    }
  }

  togglePasswordVisibility() { this.showPassword.update(v => !v); }

  onAddAdminUser() {
    if (this.adminForm.invalid || !this.selectedStudio()) return;
    const val = this.adminForm.value;
    const newAdmin: AdminUser = { id: `USR-${Date.now()}`, fullName: val.fullName, email: val.email, role: 'ADMIN_SUCURSAL' };
    const current = this.selectedStudio()!;
    const updated: BranchMatrix = { ...current, adminUsers: [...current.adminUsers, newAdmin] };
    this.studiosList.update(list => list.map(s => s.id === updated.id ? updated : s));
    this.selectedStudio.set(updated);
    this.adminForm.reset();
    alert('¡Administrador registrado correctamente!');
  }

  removeAdminUser(adminId: string) {
    const current = this.selectedStudio()!;
    const updated: BranchMatrix = { ...current, adminUsers: current.adminUsers.filter(u => u.id !== adminId) };
    this.studiosList.update(list => list.map(s => s.id === updated.id ? updated : s));
    this.selectedStudio.set(updated);
  }

  onImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && this.selectedStudio()) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Image = e.target.result;
        const current = this.selectedStudio()!;
        const updated: BranchMatrix = { ...current, galery: [...(current.galery || []), base64Image] };
        this.studiosList.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.selectedStudio.set(updated);
        this.currentImageIndex = (updated.galery?.length || 1) - 1;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number) {
    const current = this.selectedStudio()!;
    const newGalery = (current.galery || []).filter((_, i) => i !== index);
    const updated: BranchMatrix = { ...current, galery: newGalery };
    this.studiosList.update(list => list.map(s => s.id === updated.id ? updated : s));
    this.selectedStudio.set(updated);
    if (this.currentImageIndex >= newGalery.length) this.currentImageIndex = Math.max(0, newGalery.length - 1);
  }
}
