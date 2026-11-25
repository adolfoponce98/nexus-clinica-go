import {
  Component,
  signal,
  input,
  output,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Camera, Paperclip } from 'lucide-angular';

export interface ModelItem {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  src: string;
}

@Component({
  selector: 'app-advanced-3d-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './advanced-3d-viewer.component.html',
})
export class Advanced3DViewerComponent implements AfterViewInit, OnDestroy {
  readonly Math = Math;
  readonly CameraIcon = Camera;
  readonly PaperclipIcon = Paperclip;
  canAttach = input(false);
  attachmentBusy = input(false);
  attachmentError = input('');
  captureAttached = output<File>();
  capturing = signal(false);
  captureError = signal('');

  // Entradas (Inputs) configurables desde cualquier especialidad
  models = input.required<ModelItem[]>();
  selectedModelId = input.required<string>();
  isExpanded = input.required<boolean>();
  doctorName = input<string>('Médico');
  officeName = input<string>('Consultorio');

  // Salidas (Outputs) para comunicar cambios al componente padre
  close = output<void>();
  modelChanged = output<string>();

  // Estados internos del Visor
  isLoadingModel = signal<boolean>(true);
  modelOpacity = signal<number>(1);
  drawingColor = signal<string>('#2dd4bf');
  drawingWidth = signal<number>(3);
  isDrawingMode = signal<boolean>(false);
  isTextMode = signal<boolean>(false);
  textAnnotations = signal<{ x: number; y: number; text: string }[]>([]);
  activeTextDraft = signal<string>('');
  draftPosition = signal<{ x: number; y: number } | null>(null);

  currentDateTime = signal<string>('');
  private timerInterval: any;

  @ViewChild('modelViewerRef') modelViewerRef!: ElementRef;
  @ViewChild('drawingCanvas') drawingCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('exportContainer') exportContainerRef!: ElementRef<HTMLDivElement>;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = signal<boolean>(false);

  activeModel = computed(() => {
    const list = this.models();
    return list.find((m) => m.id === this.selectedModelId()) || list[0];
  });

  ngAfterViewInit() {
    if (this.isExpanded()) {
      this.initCanvas();
      this.startClock();
    }
  }

  ngOnDestroy() {
    this.stopClock();
  }

  private startClock() {
    this.updateDateTime();
    this.timerInterval = setInterval(() => this.updateDateTime(), 1000);
  }

  private stopClock() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private updateDateTime() {
    const now = new Date();
    this.currentDateTime.set(
      now.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }

  onModelLoaded() {
    this.isLoadingModel.set(false);
  }

  onModelError(event: any) {
    this.isLoadingModel.set(false);
    console.error('Error en model-viewer:', event);
  }

  initCanvas() {
    setTimeout(() => {
      if (this.drawingCanvasRef) {
        const canvas = this.drawingCanvasRef.nativeElement;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        this.ctx = canvas.getContext('2d');
        if (this.ctx) {
          this.ctx.strokeStyle = this.drawingColor();
          this.ctx.lineWidth = this.drawingWidth();
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
        }
      }
    }, 150);
  }

  setCameraView(orbit: string) {
    if (this.modelViewerRef && (this.modelViewerRef.nativeElement as any).cameraOrbit) {
      (this.modelViewerRef.nativeElement as any).cameraOrbit = orbit;
    }
  }

  startInteraction(event: MouseEvent | TouchEvent) {
    const pos = this.getPointerPos(event);
    if (this.isTextMode()) {
      this.draftPosition.set(pos);
      return;
    }
    if (!this.isDrawingMode() || !this.ctx) return;
    this.isDrawing.set(true);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  interactMove(event: MouseEvent | TouchEvent) {
    if (!this.isDrawingMode() || !this.isDrawing() || !this.ctx) return;
    event.preventDefault();
    const pos = this.getPointerPos(event);
    this.ctx.strokeStyle = this.drawingColor();
    this.ctx.lineWidth = this.drawingWidth();
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopInteraction() {
    if (!this.isDrawing()) return;
    this.isDrawing.set(false);
    if (this.ctx) this.ctx.closePath();
  }

  addTextAnnotation() {
    const text = this.activeTextDraft().trim();
    const pos = this.draftPosition();
    if (text && pos) {
      this.textAnnotations.update((current) => [...current, { x: pos.x, y: pos.y, text }]);
      this.activeTextDraft.set('');
      this.draftPosition.set(null);
    }
  }

  cancelTextDraft() {
    this.draftPosition.set(null);
    this.activeTextDraft.set('');
  }

  clearCanvas() {
    if (!this.ctx || !this.drawingCanvasRef) return;
    const canvas = this.drawingCanvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.textAnnotations.set([]);
  }

  toggleDrawingMode() {
    this.isDrawingMode.update((v) => !v);
    if (this.isDrawingMode()) this.isTextMode.set(false);
  }

  toggleTextMode() {
    this.isTextMode.update((v) => !v);
    if (this.isTextMode()) this.isDrawingMode.set(false);
  }

  async takeScreenshot(attach = false) {
    if (this.capturing() || this.attachmentBusy() || (attach && !this.canAttach())) return;
    this.capturing.set(true);
    this.captureError.set('');
    try {
      const file = await this.captureFile();
      if (attach) {
        this.captureAttached.emit(file);
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.download = file.name;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      this.captureError.set('No se pudo capturar el modelo. Inténtalo de nuevo.');
    } finally {
      this.capturing.set(false);
    }
  }

  async captureFile(): Promise<File> {
    const container = this.exportContainerRef.nativeElement;
    const modelViewer = container.querySelector('model-viewer') as any;
    const canvasDraw = this.drawingCanvasRef.nativeElement;

    let modelDataUrl = '';
    if (modelViewer && typeof modelViewer.toDataURL === 'function') {
      modelDataUrl = await modelViewer.toDataURL('image/png');
    }

    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = container.offsetWidth;
    masterCanvas.height = container.offsetHeight;
    const mCtx = masterCanvas.getContext('2d');

    if (!mCtx) throw new Error('No se pudo crear la captura.');

    if (modelDataUrl) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          mCtx.drawImage(img, 0, 0, masterCanvas.width, masterCanvas.height);
          resolve();
        };
        img.onerror = () => reject(new Error('No se pudo capturar el modelo.'));
        img.src = modelDataUrl;
      });
    }

    mCtx.drawImage(canvasDraw, 0, 0);

    mCtx.font = 'bold 12px sans-serif';
    this.textAnnotations().forEach((ann) => {
      mCtx.fillStyle = '#134e4a';
      mCtx.fillRect(ann.x - 5, ann.y - 15, mCtx.measureText(ann.text).width + 20, 24);
      mCtx.strokeStyle = '#2dd4bf';
      mCtx.strokeRect(ann.x - 5, ann.y - 15, mCtx.measureText(ann.text).width + 20, 24);
      mCtx.fillStyle = '#ccfbf1';
      mCtx.fillText(ann.text, ann.x + 5, ann.y + 2);
    });

    // Sellos de información en la captura
    mCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    mCtx.fillRect(masterCanvas.width - 280, 15, 265, 55);
    mCtx.fillStyle = '#2dd4bf';
    mCtx.font = 'bold 11px sans-serif';
    mCtx.fillText(`Dr. ${this.doctorName()}`, masterCanvas.width - 270, 32);
    mCtx.fillStyle = '#cbd5e1';
    mCtx.font = '10px sans-serif';
    mCtx.fillText(`Consultorio: ${this.officeName()}`, masterCanvas.width - 270, 46);
    mCtx.fillText(this.currentDateTime(), masterCanvas.width - 270, 60);

    mCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    mCtx.fillRect(15, masterCanvas.height - 45, 200, 30);
    mCtx.fillStyle = '#2dd4bf';
    mCtx.font = 'bold 11px sans-serif';
    mCtx.fillText(`Especialista: Dr. ${this.doctorName()}`, 25, masterCanvas.height - 25);

    const blob = await new Promise<Blob>((resolve, reject) => {
      masterCanvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('No se pudo generar la imagen.'))),
        'image/png',
      );
    });
    return new File(
      [blob],
      `Infografia_3D_${this.activeModel().name.replace(/\s+/g, '_')}_${Date.now()}.png`,
      { type: 'image/png' },
    );
  }

  private getPointerPos(event: MouseEvent | TouchEvent) {
    const canvas = this.drawingCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if (window.TouchEvent && event instanceof TouchEvent) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }
}
