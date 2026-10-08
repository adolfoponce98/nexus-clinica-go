import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, User } from 'lucide-angular';

@Component({
  selector: 'app-basic-info-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      <div class="border-b pb-4 flex justify-between items-center" style="border-color: var(--border-color);">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider" style="color: var(--text-main);">Información Básica e Introducción</h3>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">+10 puntos de visibilidad. Añade tu información principal y foto.</p>
        </div>
        <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black">+10 pts</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Tratamiento / Título</label>
          <input type="text" [(ngModel)]="data.title" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Nombre</label>
          <input type="text" [(ngModel)]="data.firstName" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Apellidos</label>
          <input type="text" [(ngModel)]="data.lastName" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Género</label>
          <select [(ngModel)]="data.gender" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-sm" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Foto de perfil (Rostro visible)</label>
          <input type="file" class="w-full border rounded-2xl px-4 py-2 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-muted);">
        </div>

        <div class="space-y-1.5 sm:col-span-3">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">+10 puntos: Introducción / Sobre mí</label>
          <textarea rows="4" [(ngModel)]="data.bio" class="w-full border rounded-2xl p-4 text-xs outline-none focus:border-blue-500 resize-none shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);" placeholder="Especialista dedicado a brindar la mejor atención..."></textarea>
        </div>
      </div>
    </div>
  `
})
export class BasicInfoTabComponent {
  data = {
    title: 'Dr.',
    firstName: 'Adolfo',
    lastName: 'Ponce',
    gender: 'Masculino',
    bio: ''
  };
}
