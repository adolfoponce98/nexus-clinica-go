import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, UploadCloud, CheckCircle, Trash2 } from 'lucide-angular';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

@Component({
  selector: 'app-media-tab',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      <div class="border-b pb-4 flex justify-between items-center" style="border-color: var(--border-color);">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider" style="color: var(--text-main);">Fotos y Videos de la Clínica</h3>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">Sube contenido multimedia de tus instalaciones.</p>
        </div>
      </div>

      <!-- Selector de archivos -->
      <div class="border-2 border-dashed p-8 rounded-3xl text-center space-y-3 cursor-pointer hover:border-blue-500 transition-colors" style="border-color: var(--border-color);">
        <input type="file" multiple accept="image/*,video/*" (change)="onFilesSelected($event)" class="hidden" id="fileInput">
        <label for="fileInput" class="cursor-pointer space-y-2 block">
          <lucide-icon [img]="icons.UploadCloud" class="w-10 h-10 mx-auto text-blue-500"></lucide-icon>
          <p class="text-xs font-bold" style="color: var(--text-main);">Haz clic para seleccionar fotos o arrastrarlas aquí</p>
          <p class="text-[10px]" style="color: var(--text-muted);">PNG, JPG, MP4 hasta 50MB</p>
        </label>
      </div>

      <!-- Barra de progreso de subida -->
      @if (uploadProgress() > 0 && uploadProgress() < 100) {
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-bold" style="color: var(--text-main);">
            <span>Subiendo a Cloud Storage...</span>
            <span>{{ uploadProgress() }}%</span>
          </div>
          <div class="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div class="bg-blue-600 h-full transition-all duration-300" [style.width.%]="uploadProgress()"></div>
          </div>
        </div>
      }

      <!-- Galería de URLs subidas -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        @for (url of uploadedUrls(); track url) {
          <div class="relative border rounded-2xl overflow-hidden group aspect-square bg-zinc-900" style="border-color: var(--border-color);">
            <img [src]="url" class="w-full h-full object-cover">
          </div>
        }
      </div>
    </div>
  `
})
export class MediaTabComponent {
  readonly icons = { UploadCloud, CheckCircle, Trash2 };
  uploadProgress = signal(0);
  uploadedUrls = signal<string[]>([]);

  async onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    // Simulación del progreso de subida a Firebase Cloud Storage
    const storage = getStorage();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `doctors_media/${Date.now()}_${file.name}`);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          this.uploadProgress.set(progress);
        },
        (error) => {
          console.error('Error al subir archivo:', error);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          this.uploadedUrls.update(list => [...list, downloadUrl]);
          this.uploadProgress.set(0);
          alert('¡Archivo multimedia subido a Storage y guardado con éxito!');
        }
      );
    }
  }
}
