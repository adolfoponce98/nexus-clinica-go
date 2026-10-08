import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-legal-info-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      <div class="border-b pb-4 flex justify-between items-center" style="border-color: var(--border-color);">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider" style="color: var(--text-main);">Datos Legales y Especialidades</h3>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">Licencia profesional y áreas de especialización.</p>
        </div>
        <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black">+27 pts disp.</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Cédula Profesional</label>
          <input type="text" [(ngModel)]="data.license" placeholder="Ej. Cédula #12345678" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Especialidad Principal</label>
          <input type="text" [(ngModel)]="data.specialty" placeholder="Ej. Traumatología y Ortopedia" class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);">
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Principales enfermedades tratadas</label>
          <textarea rows="3" [(ngModel)]="data.mainDiseases" placeholder="Muestra a tus pacientes qué condiciones atiendes..." class="w-full border rounded-2xl p-4 text-xs outline-none focus:border-blue-500 resize-none shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"></textarea>
        </div>
      </div>
    </div>
  `
})
export class LegalInfoTabComponent {
  data = {
    license: '',
    specialty: '',
    mainDiseases: ''
  };
}
