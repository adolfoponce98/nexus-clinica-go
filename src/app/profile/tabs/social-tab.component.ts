import { PermissionDirective } from '../../auth/permission.directive';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Facebook, Instagram, Linkedin } from 'lucide-angular';

@Component({
  selector: 'app-social-tab',
  standalone: true,
  imports: [PermissionDirective, CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-6 animate-in fade-in duration-300">
      <div
        class="border-b pb-4 flex justify-between items-center"
        style="border-color: var(--border-color);"
      >
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider" style="color: var(--text-main);">
            Presencia Online y Redes Sociales
          </h3>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">
            Conecta tus redes para generar mayor confianza con tus pacientes.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label
            class="text-[11px] font-bold uppercase flex items-center gap-2"
            style="color: var(--text-muted);"
          >
            <lucide-icon [img]="icons.Facebook" class="w-4 h-4 text-blue-500"></lucide-icon>
            Facebook
          </label>
          <input
            type="text"
            [(ngModel)]="data.facebook"
            placeholder="https://facebook.com/tudoc"
            class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner"
            style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"
            appPermission="config:write"
          />
        </div>

        <div class="space-y-1.5">
          <label
            class="text-[11px] font-bold uppercase flex items-center gap-2"
            style="color: var(--text-muted);"
          >
            <lucide-icon [img]="icons.Instagram" class="w-4 h-4 text-pink-500"></lucide-icon>
            Instagram
          </label>
          <input
            type="text"
            [(ngModel)]="data.instagram"
            placeholder="https://instagram.com/tudoc"
            class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner"
            style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"
            appPermission="config:write"
          />
        </div>

        <div class="space-y-1.5">
          <label
            class="text-[11px] font-bold uppercase flex items-center gap-2"
            style="color: var(--text-muted);"
          >
            <lucide-icon [img]="icons.Linkedin" class="w-4 h-4 text-blue-400"></lucide-icon>
            LinkedIn
          </label>
          <input
            type="text"
            [(ngModel)]="data.linkedin"
            placeholder="https://linkedin.com/in/tudoc"
            class="w-full border rounded-2xl px-4 py-3 text-xs outline-none focus:border-blue-500 shadow-inner"
            style="background-color: var(--bg-primary); border-color: var(--border-color); color: var(--text-main);"
            appPermission="config:write"
          />
        </div>
      </div>
    </div>
  `,
})
export class SocialTabComponent {
  readonly icons = { Facebook, Instagram, Linkedin };
  data = {
    facebook: '',
    instagram: '',
    linkedin: '',
  };
}
