import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-experience-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      <div class="border-b pb-4 flex justify-between items-center" style="border-color: var(--border-color);">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider" style="color: var(--text-main);">Experiencia, Educación y Logros</h3>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">Construye confianza describiendo tu trayectoria profesional.</p>
        </div>
        <span class="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-black uppercase">Plan Pro</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Experiencia Profesional</label>
          <textarea rows="4" [(ngModel)]="data.experience" placeholder="Hospitales, clínicas o años de práctica..." class="w-full border rounded-2xl p-4 text-xs outline-none focus:border-blue-500 resize-none shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"></textarea>
        </div>
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase" style="color: var(--text-muted);">Educación y Posgrados</label>
          <textarea rows="4" [(ngModel)]="data.education" placeholder="Universidades, especialidades, certificaciones..." class="w-full border rounded-2xl p-4 text-xs outline-none focus:border-blue-500 resize-none shadow-inner" style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"></textarea>
        </div>
      </div>
    </div>
  `
})
export class ExperienceTabComponent {
  data = {
    experience: '',
    education: ''
  };
}
