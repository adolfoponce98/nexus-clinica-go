import { PhysicalTemplateDialogComponent } from './physical-template-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {
  ClinicalAssetDialogComponent,
  ClinicalAssetKind,
} from '../clinical/clinical-asset-dialog.component';
import { SubscriptionLockComponent } from '../planes/subscription-lock.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { BillingService } from '../planes/billing.service';
import { PrescriptionWorkspaceComponent } from './prescription-workspace.component';
import { PermissionDirective } from '../auth/permission.directive';
import { API_URLS } from '../config/api-urls';
import { Component, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Camera,
  FolderOpen,
  Stethoscope,
  User,
  Calendar,
  MapPin,
  FileText,
  Printer,
  Save,
  ArrowLeft,
  ShieldCheck,
  Pill,
  Phone,
  Sparkles,
  Upload,
  Image as ImageIcon,
} from 'lucide-angular';

@Component({
  selector: 'app-receta-medica',
  standalone: true,
  imports: [
    SubscriptionLockComponent,
    PrescriptionWorkspaceComponent,
    PermissionDirective,
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
  ],
  templateUrl: 'receta-medica.component.html',
})
export class RecetaMedicaComponent {
  readonly billing = inject(BillingService);
  private readonly clinicApi = inject(ClinicApiService);
  private aiAttempt: { file: File; type: number; id: string } | null = null;
  private readonly dialogs = inject(MatDialog);
  openPhysicalTemplate() {
    this.locked.set(false);
    this.dialogs.open(PhysicalTemplateDialogComponent, {
      width: '1220px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      disableClose: true,
      panelClass: 'nexus-asset-dialog',
      ariaLabel: 'Digitalizar recetario físico',
    });
  }
  openAsset(kind: ClinicalAssetKind) {
    this.locked.set(false);
    this.dialogs.open(ClinicalAssetDialogComponent, {
      data: { kind },
      width: kind === 'signature' ? '780px' : '1050px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      disableClose: true,
      panelClass: 'nexus-asset-dialog',
      ariaLabel: kind === 'signature' ? 'Firma digitalizada' : 'Digitalizar logo',
    });
  }
  readonly locked = signal(false);
  goPlans() {
    void this.router.navigate(['/planes']);
  }
  openUpcoming() {
    this.locked.set(true);
  }
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  readonly icons = {
    Camera,
    FolderOpen,
    Stethoscope,
    User,
    Calendar,
    MapPin,
    FileText,
    Printer,
    Save,
    ArrowLeft,
    ShieldCheck,
    Pill,
    Phone,
    Sparkles,
    Upload,
    ImageIcon,
  };

  // 🔀 Control de Vistas actualizado
  currentView = signal<'listado' | 'editor-receta' | 'digitalizador'>('listado');

  recetaForm: FormGroup;
  isLoading = signal(false);

  // Estados para los módulos de Digitalización con IA
  selectedFile: File | null = null;
  localPreviewUrl: string | null = null;
  isGeneratingAI = signal(false);
  generatedAiImageUrl: string | null = null;

  // Credenciales y URL de la Cloud Function
  private readonly GENERATE_BLANK_URL = API_URLS.GENERATE_BLANK_PRESCRIPTION;

  constructor() {
    this.recetaForm = this.fb.group({
      pacienteNombre: ['', [Validators.required]],
      pacienteEdad: ['', [Validators.required]],
      pacientePeso: [''],
      diagnostico: ['', [Validators.required]],
      medicamentos: ['', [Validators.required]],
      indicaciones: ['', [Validators.required]],
      proximaCita: [''],
    });
  }

  cambiarVista(vista: 'listado' | 'editor-receta' | 'digitalizador') {
    this.locked.set(false);
    this.currentView.set(vista);
    // Limpiar archivos temporales al cambiar de vista si es necesario
    if (vista === 'listado') {
      this.selectedFile = null;
      this.localPreviewUrl = null;
      this.generatedAiImageUrl = null;
    }
    this.cdr.detectChanges();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.generatedAiImageUrl = null;
      const reader = new FileReader();
      reader.onload = () => {
        this.localPreviewUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Método unificado para consumir la IA enviando typeDocument (1 para receta, 2 para firma)
  async generarDigitalizacionAI(typeDoc: number) {
    const file = this.selectedFile;
    if (!file || this.isGeneratingAI()) return;
    if (!this.billing.allows('ai') || Number(this.billing.state()?.aiCredits || 0) < 1) {
      alert(
        'Necesitas una suscripción activa y créditos IA. Cada operación completada consume 1 crédito.',
      );
      return;
    }
    this.isGeneratingAI.set(true);
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      if (this.aiAttempt?.file !== file || this.aiAttempt?.type !== typeDoc)
        this.aiAttempt = { file, type: typeDoc, id: crypto.randomUUID() };
      const response = await this.clinicApi.post(this.GENERATE_BLANK_URL, {
        requestId: this.aiAttempt.id,
        typeDocument: typeDoc,
        imageBase64: source.split(',')[1],
        mimeType: file.type || 'image/jpeg',
      });
      if (!response.imageBase64) throw new Error('La IA no devolvió una imagen válida.');
      this.generatedAiImageUrl = `data:${response.mimeType};base64,${response.imageBase64}`;
      await this.billing.refresh();
    } catch (error: any) {
      alert(error.message || 'No se pudo completar la digitalización.');
    } finally {
      this.isGeneratingAI.set(false);
      this.cdr.detectChanges();
    }
  }

  guardarRecetarioDigitalStorage() {
    alert('¡Plantilla digitalizada guardada y vinculada al expediente con éxito!');
    this.cambiarVista('listado');
  }

  volverAlHome() {
    this.router.navigate(['/home']);
  }
}
