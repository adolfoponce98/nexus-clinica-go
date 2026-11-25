import { GoogleReviewSettingsComponent } from './tabs/google-review-settings.component';
import { GoogleCalendarConnectionComponent } from '../calendar/google-calendar-connection.component';
import { AuthService } from '../auth/auth.service';
import { ClinicalIdentityComponent } from '../clinical/clinical-identity.component';
import { PermissionService } from '../auth/permission.service';
import { ConnectedDevicesComponent } from './tabs/connected-devices.component';
import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ShieldCheck, Building2, Stethoscope, PlugZap } from 'lucide-angular';
import { ClinicsTabComponent } from './tabs/clinics-tab.component';
import { MedicalFollowupViewComponent } from './tabs/medical-followup-view'; // <--- Nuevo componente importado

@Component({
  selector: 'app-doctor-profile-container',
  styleUrl: './doctor-profile-container.component.css',
  standalone: true,
  imports: [
    GoogleReviewSettingsComponent,
    GoogleCalendarConnectionComponent,
    ClinicalIdentityComponent,
    CommonModule,
    LucideAngularModule,
    ConnectedDevicesComponent,
    ClinicsTabComponent,
    MedicalFollowupViewComponent, // <--- Añadido aquí
  ],
  template: `
    <div
      class="min-h-screen font-sans p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      style="background-color: var(--bg-primary); color: var(--text-main);"
    >
      <!-- CABECERA -->
      <div
        class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border px-6 py-5 rounded-3xl shadow-xl"
        style="background-color: var(--bg-secondary); border-color: var(--border-color);"
      >
        <div>
          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider"
              >Configuración Profesional</span
            >
          </div>
          <h1 class="text-2xl font-black tracking-tight mt-1" style="color: var(--text-main);">
            Mi Perfil Médico y Consultorios
          </h1>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">
            Administra tus centros de trabajo, servicios, métodos de pago y datos profesionales.
          </p>
        </div>

        <p class="text-xs max-w-48 leading-relaxed" style="color:var(--text-muted)">
          Guarda los cambios desde cada sección.
        </p>
      </div>

      <!-- PESTAÑAS DE CONFIGURACIÓN -->
      <div class="flex flex-wrap items-center gap-2">
        @for (tab of visibleTabs(); track tab.id) {
          <button
            (click)="activeTab.set(tab.id)"
            class="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border shadow-sm"
            [style.background-color]="activeTab() === tab.id ? '#2563eb' : 'var(--bg-secondary)'"
            [style.color]="activeTab() === tab.id ? '#ffffff' : 'var(--text-muted)'"
            [style.border-color]="activeTab() === tab.id ? '#3b82f6' : 'var(--border-color)'"
          >
            <lucide-icon [img]="tab.icon" class="w-4 h-4"></lucide-icon>
            <span>{{ tab.name }}</span>
          </button>
        }
      </div>

      <!-- CONTENEDOR DE LA PESTAÑA ACTIVA -->
      <div
        class="border p-6 sm:p-8 rounded-3xl shadow-xl min-h-[480px]"
        style="background-color: var(--bg-secondary); border-color: var(--border-color);"
      >
        @switch (activeTab()) {
          @case ('clinical-identity') {
            <app-clinical-identity />
          }
          @case ('integrations') {
            <section class="integrations-section">
              <header class="integrations-heading">
                <span>HERRAMIENTAS CONECTADAS</span>
                <h2>Integraciones</h2>
                <p>
                  Conecta tus herramientas y mantén la información de tu consultorio en un solo
                  flujo.
                </p>
              </header>
              <div class="integrations-grid">
                <app-google-calendar-connection appearance="card" />
                <app-google-review-settings />
              </div>
            </section>
          }
          @case ('devices') {
            <app-connected-devices />
          }
          @case ('clinics') {
            <app-clinics-tab />
          }
          @case ('clinical') {
            <app-medical-followup-view />
          }
          <!-- <--- Nueva pestaña renderizada -->
        }
      </div>
    </div>
  `,
})
export class DoctorProfileContainerComponent {
  private readonly permissions = inject(PermissionService);
  private readonly auth = inject(AuthService);
  activeTab = signal('clinical-identity');
  visibleTabs = computed(() =>
    this.tabsConfig().filter((t) =>
      t.id === 'integrations'
        ? !this.auth.getSession()?.idDoctor &&
          Number(this.auth.getSession()?.typeUser ?? this.auth.getSession()?.role) === 1 &&
          this.permissions.can('calendar')
        : t.id === 'clinical-identity'
          ? this.permissions.can('followUps') ||
            this.permissions.can('prescriptions') ||
            this.permissions.can('nursing')
          : this.permissions.can(
              t.id === 'devices' ? 'devices' : t.id === 'clinics' ? 'consultorios' : 'config',
            ),
    ),
  );
  constructor() {
    effect(() => {
      const tabs = this.visibleTabs();
      if (!tabs.some((t) => t.id === this.activeTab())) this.activeTab.set(tabs[0]?.id || '');
    });
  }

  // Configuración de pestañas incluyendo la nueva pestaña de formato clínico
  tabsConfig = signal([
    { id: 'clinical-identity', name: 'Identidad y firma', icon: ShieldCheck },
    { id: 'devices', name: 'Dispositivos conectados', icon: ShieldCheck },
    { id: 'integrations', name: 'Integraciones', icon: PlugZap },
    { id: 'clinics', name: 'Consultorios', icon: Building2 },
    { id: 'clinical', name: 'Personalizar expediente', icon: Stethoscope },
  ]);
}
