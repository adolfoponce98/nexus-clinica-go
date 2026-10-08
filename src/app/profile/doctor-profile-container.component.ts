import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, User, ShieldCheck, Building2, Briefcase, ImageIcon, Share2, Check } from 'lucide-angular';
import { BasicInfoTabComponent } from './tabs/basic-info-tab.component';
import { LegalInfoTabComponent } from './tabs/legal-info-tab.component';
import { ClinicsTabComponent } from './tabs/clinics-tab.component';
import { ExperienceTabComponent } from './tabs/experience-tab.component';
import { MediaTabComponent } from './tabs/media-tab.component';
import { SocialTabComponent } from './tabs/social-tab.component';
import { AuthService } from '../auth/auth.service';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-doctor-profile-container',
  standalone: true,
  imports: [
    CommonModule, LucideAngularModule,
    BasicInfoTabComponent, LegalInfoTabComponent, ClinicsTabComponent,
    ExperienceTabComponent, MediaTabComponent, SocialTabComponent
  ],
  template: `
    <div class="min-h-screen font-sans p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" style="background-color: var(--bg-primary); color: var(--text-main);">

      <!-- CABECERA -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border px-6 py-5 rounded-3xl shadow-xl" style="background-color: var(--bg-secondary); border-color: var(--border-color);">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">Configuración Profesional</span>
            <span class="text-xs" style="color: var(--text-muted);">Visibilidad del perfil: <strong class="text-emerald-500">85%</strong></span>
          </div>
          <h1 class="text-2xl font-black tracking-tight mt-1" style="color: var(--text-main);">Mi Perfil Médico y Consultorios</h1>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">Administra tus centros de trabajo, servicios, métodos de pago y datos profesionales.</p>
        </div>

        <button (click)="saveAllProfile()" class="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer">
          Guardar Todo Globalmente
        </button>
      </div>

      <!-- PESTAÑAS CON INDICADORES DE ESTADO (Verde, Naranja, Rojo) -->
      <div class="flex flex-wrap items-center gap-2">
        @for (tab of tabsConfig(); track tab.id) {
          <button (click)="activeTab.set(tab.id)"
                  class="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border shadow-sm"
                  [style.background-color]="activeTab() === tab.id ? '#2563eb' : 'var(--bg-secondary)'"
                  [style.color]="activeTab() === tab.id ? '#ffffff' : 'var(--text-muted)'"
                  [style.border-color]="activeTab() === tab.id ? '#3b82f6' : 'var(--border-color)'">
            <lucide-icon [img]="tab.icon" class="w-4 h-4"></lucide-icon>
            <span>{{ tab.name }}</span>
            <!-- Indicador de llenado: verde (completo), naranja (parcial), rojo (vacío) -->
            <span class="w-2.5 h-2.5 rounded-full" [ngClass]="{
              'bg-emerald-400': tab.status === 'complete',
              'bg-amber-400': tab.status === 'partial',
              'bg-rose-500': tab.status === 'empty'
            }" [title]="'Estado: ' + tab.status"></span>
          </button>
        }
      </div>

      <!-- CONTENEDOR DE LA PESTAÑA ACTIVA -->
      <div class="border p-6 sm:p-8 rounded-3xl shadow-xl min-h-[480px]" style="background-color: var(--bg-secondary); border-color: var(--border-color);">
        @switch (activeTab()) {
          @case ('basic') { <app-basic-info-tab /> }
          @case ('legal') { <app-legal-info-tab /> }
          @case ('clinics') { <app-clinics-tab /> }
          @case ('experience') { <app-experience-tab /> }
          @case ('media') { <app-media-tab /> }
          @case ('social') { <app-social-tab /> }
        }
      </div>
    </div>
  `
})
export class DoctorProfileContainerComponent {
  private authService = inject(AuthService);
  activeTab = signal('basic');

  // Estados dinámicos de cada pestaña (puedes enlazarlos a tus Forms o Signals reales)
  tabsConfig = signal([
    { id: 'basic', name: 'Información Básica', icon: User, status: 'complete' }, // verde
    { id: 'legal', name: 'Datos y Especialidades', icon: ShieldCheck, status: 'partial' }, // naranja
    { id: 'clinics', name: 'Consultorios', icon: Building2, status: 'complete' }, // verde
    { id: 'experience', name: 'Experiencia y Trayectoria', icon: Briefcase, status: 'empty' }, // rojo
    { id: 'media', name: 'Fotos y Videos', icon: ImageIcon, status: 'partial' }, // naranja
    { id: 'social', name: 'Redes Sociales', icon: Share2, status: 'empty' } // rojo
  ]);

  async saveAllProfile() {
    alert('Guardando todos los nodos del perfil de forma encriptada...');
    // Aquí ejecutas la llamada global a la Cloud Function enviando todos los nodos juntos.
  }
}
