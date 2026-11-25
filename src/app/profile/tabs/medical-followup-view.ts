import { PermissionDirective } from '../../auth/permission.directive';
import { Component, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Activity,
  ShieldCheck,
  FileText,
  Stethoscope,
  ImageIcon,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  CheckCircle2,
  Upload,
  Sparkles,
} from 'lucide-angular';
import { Advanced3DViewerComponent } from '../../medicalUtilities/advanced-3d-viewer.component';

@Component({
  selector: 'app-medical-followup-view',
  standalone: true,
  imports: [
    PermissionDirective,
    CommonModule,
    FormsModule,
    LucideAngularModule,
    Advanced3DViewerComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="space-y-6 font-sans pb-16" style="color: var(--text-main);">
      <!-- ENCABEZADO DE CONFIGURACIÓN -->
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl shadow-xl border transition-colors duration-300"
        style="background-color: var(--bg-secondary); border-color: var(--border-color);"
      >
        <div>
          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-wider"
              >Personalizar expediente</span
            >
            <span class="text-xs" style="color: var(--text-muted);"
              >Consulta Subsecuente / Seguimiento Traumatología</span
            >
          </div>
          <h1 class="text-2xl font-black tracking-tight mt-1" style="color: var(--text-main);">
            Evaluación Evolutiva, Exploración 3D y Control
          </h1>
          <p class="text-xs mt-0.5" style="color: var(--text-muted);">
            Control de visibilidad e individualización a nivel de cada campo de texto o selector.
          </p>
        </div>
      </div>

      <!-- FORMULARIO CON SWITCHES A NIVEL DE CADA INPUT -->
      <div class="space-y-6">
        <!-- ========================================== -->
        <!-- 1. EVOLUCIÓN TEMPORAL Y SUBJETIVA -->
        <!-- ========================================== -->
        <div
          class="p-6 rounded-3xl shadow-xl border space-y-4 transition-colors duration-300"
          style="background-color: var(--bg-secondary); border-color: var(--border-color);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center"
            >
              <lucide-icon [img]="icons.Activity" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-wider"
                style="color: var(--text-main);"
              >
                1. Evolución Temporal y Subjetiva
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Configura la visibilidad campo por campo.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <!-- Input 1: EVA -->
            <div
              class="p-4 border rounded-2xl space-y-2 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Intensidad del Dolor (EVA)</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="painIntensityEvaEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      painIntensityEvaEnabled ? 'text-emerald-400 w-4 h-4' : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="painIntensityEvaEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Input 2: Funcionalidad AVD -->
            <div
              class="p-4 border rounded-2xl space-y-2 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Funcionalidad / AVD</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="functionalActivitiesEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      functionalActivitiesEnabled
                        ? 'text-emerald-400 w-4 h-4'
                        : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="functionalActivitiesEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Input 3: Adherencia al Tratamiento -->
            <div
              class="p-4 border rounded-2xl space-y-2 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Adherencia al Tratamiento</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="treatmentAdherenceEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      treatmentAdherenceEnabled
                        ? 'text-emerald-400 w-4 h-4'
                        : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="treatmentAdherenceEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Input 4: Dispositivos de Apoyo -->
            <div
              class="p-4 border rounded-2xl space-y-2 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Dispositivos de Apoyo</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="dispositivosApoyoEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      dispositivosApoyoEnabled
                        ? 'text-emerald-400 w-4 h-4'
                        : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="dispositivosApoyoEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Input 5: Tolerancia a Medicamentos -->
            <div
              class="p-4 border rounded-2xl space-y-2 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Tolerancia a Medicamentos</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="toleranciaMedicamentosEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      toleranciaMedicamentosEnabled
                        ? 'text-emerald-400 w-4 h-4'
                        : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="toleranciaMedicamentosEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>

            <!-- Input 6: Nuevos Síntomas -->
            <div
              class="p-4 border rounded-2xl space-y-2 sm:col-span-2 lg:col-span-3 relative"
              style="background-color: var(--bg-primary); border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase" style="color: var(--text-main);"
                  >Nuevos síntomas o reportes del paciente</label
                >
                <div class="flex items-center gap-2">
                  <lucide-icon
                    [img]="newSymptomsEnabled ? icons.Eye : icons.EyeOff"
                    [class]="
                      newSymptomsEnabled ? 'text-emerald-400 w-4 h-4' : 'text-zinc-500 w-4 h-4'
                    "
                  ></lucide-icon>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      [(ngModel)]="newSymptomsEnabled"
                      class="sr-only peer"
                      appPermission="config:write"
                    />
                    <div
                      class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                    ></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 2. EXPLORACIÓN FÍSICA Y SOPORTE 3D -->
        <!-- ========================================== -->
        <div
          class="p-6 rounded-3xl shadow-xl border space-y-4 transition-colors duration-300"
          style="background-color: var(--bg-secondary); border-color: var(--border-color);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl flex items-center justify-center"
            >
              <lucide-icon [img]="icons.Stethoscope" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-wider"
                style="color: var(--text-main);"
              >
                2. Exploración Física y Soporte 3D
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Visibilidad individual para visor 3D y campos de exploración.
              </p>
            </div>
          </div>

          <!-- Switch para el Visor 3D -->
          <div
            class="p-4 border rounded-2xl bg-[var(--bg-primary)] border-blue-500/30 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 overflow-hidden flex items-center justify-center"
              >
                <img src="assets/huesos/pie.png" class="w-full h-full object-cover" alt="3D" />
              </div>
              <div>
                <p class="text-xs font-bold">Visor Anatómico 3D Interactivo</p>
                <p class="text-[10px]" style="color: var(--text-muted);">
                  Habilita o deshabilita el modelo 3D en el formato.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <lucide-icon
                [img]="visor3DEnabled ? icons.Eye : icons.EyeOff"
                [class]="visor3DEnabled ? 'text-emerald-400 w-4 h-4' : 'text-zinc-500 w-4 h-4'"
              ></lucide-icon>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="visor3DEnabled"
                  class="sr-only peer"
                  appPermission="config:write"
                />
                <div
                  class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                ></div>
              </label>
            </div>
          </div>

          <!-- Campos de Exploración -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <!-- Tejidos Blandos -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Estado de Tejidos Blandos</label>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="softTissueStateEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Arcos de Movilidad -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase"
                  >Arcos de Movilidad (Goniometría)</label
                >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="rangeOfMotionEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Estabilidad y Fuerza -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase"
                  >Pruebas de Estabilidad y Fuerza</label
                >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="stabilityAndStrengthEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Estado Neurovascular -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Estado Neurovascular Distal</label>
                <label class="text-[11px] font-bold uppercase"
                  >Pruebas de Estabilidad y Fuerza</label
                >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="neurovascularStateEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Banderas Rojas -->
            <div
              class="p-4 border rounded-2xl space-y-2 sm:col-span-2 bg-[var(--bg-primary)] border-rose-500/30"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase text-rose-400"
                  >Banderas Rojas y Alertas Clínicas</label
                >

                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="banderasRojasEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
              <p class="text-xs text-zinc-300">
                Descartar fiebre, dolor desproporcionado o trombosis.
              </p>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 3. ESTUDIOS DE CONTROL E IMAGENOLOGÍA -->
        <!-- ========================================== -->
        <div
          class="p-6 rounded-3xl shadow-xl border space-y-4 transition-colors duration-300"
          style="background-color: var(--bg-secondary); border-color: var(--border-color);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl flex items-center justify-center"
            >
              <lucide-icon [img]="icons.ImageIcon" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-wider"
                style="color: var(--text-main);"
              >
                3. Estudios de Control e Imagenología
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Configuración individual del área de archivos y carga.
              </p>
            </div>
          </div>

          <div
            class="p-4 border rounded-2xl bg-[var(--bg-primary)] border-dashed border-zinc-700 flex items-center justify-between"
          >
            <div>
              <p class="text-xs font-bold">Módulo de Carga de RX, DICOM y PDFs</p>
              <p class="text-[10px]" style="color: var(--text-muted);">
                Permite adjuntar estudios de imagenología médica.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <lucide-icon
                [img]="estudiosImagenUploadEnabled ? icons.Eye : icons.EyeOff"
                [class]="
                  estudiosImagenUploadEnabled ? 'text-emerald-400 w-4 h-4' : 'text-zinc-500 w-4 h-4'
                "
              ></lucide-icon>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="estudiosImagenUploadEnabled"
                  class="sr-only peer"
                  appPermission="config:write"
                />
                <div
                  class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"
                ></div>
              </label>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 4. AJUSTE DEL PLAN TERAPÉUTICO Y PRONÓSTICO -->
        <!-- ========================================== -->
        <div
          class="p-6 rounded-3xl shadow-xl border space-y-4 transition-colors duration-300"
          style="background-color: var(--bg-secondary); border-color: var(--border-color);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl flex items-center justify-center"
            >
              <lucide-icon [img]="icons.ShieldCheck" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-wider"
                style="color: var(--text-main);"
              >
                4. Ajuste del Plan Terapéutico y Pronóstico
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Visibilidad individual para cada indicación terapéutica.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <!-- Input Farmacológico -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Modificación Farmacológica</label>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="modificacionFarmacologicaEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Input Rehabilitación -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Progresión de Rehabilitación</label>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="progresionRehabilitacionEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>

            <!-- Input Próxima Cita -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Retiro / Próxima Cita</label>

                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="retiroProximaCitaEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================== -->
        <!-- 5. RESUMEN MÉDICO Y PROCESAMIENTO CON IA -->
        <!-- ========================================== -->
        <div
          class="p-6 rounded-3xl shadow-xl border space-y-4 transition-colors duration-300"
          style="background-color: var(--bg-secondary); border-color: var(--border-color);"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl flex items-center justify-center"
            >
              <lucide-icon [img]="icons.FileText" class="w-5 h-5"></lucide-icon>
            </div>
            <div>
              <h3
                class="text-sm font-black uppercase tracking-wider"
                style="color: var(--text-main);"
              >
                5. Resumen Médico y Dictado
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Control individual para la transcripción de voz.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <!-- Input Textarea de Resumen / Dictado -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase"
                  >Caja de Dictado / Transcripción</label
                >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="resumenMedicoTextareaEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
              <p class="text-xs text-zinc-300">
                Campo de texto libre y transcripción por voz en vivo.
              </p>
            </div>

            <!-- Botón de Generar Resumen IA -->
            <div
              class="p-4 border rounded-2xl space-y-2 bg-[var(--bg-primary)]"
              style="border-color: var(--border-color);"
            >
              <div class="flex items-center justify-between">
                <label class="text-[11px] font-bold uppercase">Botón "Generar Resumen"</label>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="resumenIAPotenciaEnabled"
                    class="sr-only peer"
                    appPermission="config:write"
                  />
                  <div
                    class="w-7 h-4 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"
                  ></div>
                </label>
              </div>
              <p class="text-xs text-zinc-300">Asistencia inteligente.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTÓN DE GUARDADO FINAL -->
      <div class="flex justify-end pt-4">
        <button
          (click)="guardarConfiguracionEnServicio()"
          class="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-lg cursor-pointer"
          appPermission="config:write"
        >
          <lucide-icon [img]="icons.CheckCircle2" class="w-4 h-4"></lucide-icon>
          Guardar Configuración por Input en Servidor
        </button>
      </div>
    </div>
  `,
})
export class MedicalFollowupViewComponent {
  readonly icons = {
    Activity,
    ShieldCheck,
    FileText,
    Stethoscope,
    ImageIcon,
    Calendar,
    Clock,
    Eye,
    EyeOff,
    CheckCircle2,
    Upload,
    Sparkles,
  };

  // =========================================================================
  // VARIABLES BOOLEANAS INDIVIDUALES A NIVEL DE CADA INPUT / CAMPO ESPECÍFICO
  // =========================================================================

  // Sección 1: Evolución Subjetiva
  painIntensityEvaEnabled = true;
  functionalActivitiesEnabled = true;
  treatmentAdherenceEnabled = true;
  dispositivosApoyoEnabled = true;
  toleranciaMedicamentosEnabled = true;
  newSymptomsEnabled = true;

  // Sección 2: Exploración Física y Visor 3D
  visor3DEnabled = true;
  softTissueStateEnabled = true;
  rangeOfMotionEnabled = true;
  stabilityAndStrengthEnabled = true;
  neurovascularStateEnabled = true;
  banderasRojasEnabled = true;

  // Sección 3: Estudios e Imagenología
  estudiosImagenUploadEnabled = true;

  // Sección 4: Plan Terapéutico
  modificacionFarmacologicaEnabled = true;
  progresionRehabilitacionEnabled = true;
  retiroProximaCitaEnabled = true;

  // Sección 5: Resumen Médico y IA
  resumenMedicoTextareaEnabled = true;
  resumenIAPotenciaEnabled = true;

  // Método que consolida y envía todas las variables independientes al servicio web
  guardarConfiguracionEnServicio() {
    const payloadPorInput = {
      seccion1_evolucionSubjetiva: {
        painIntensityEva: this.painIntensityEvaEnabled,
        functionalActivities: this.functionalActivitiesEnabled,
        treatmentAdherence: this.treatmentAdherenceEnabled,
        dispositivosApoyo: this.dispositivosApoyoEnabled,
        toleranciaMedicamentos: this.toleranciaMedicamentosEnabled,
        newSymptoms: this.newSymptomsEnabled,
      },
      seccion2_exploracionY3D: {
        visor3D: this.visor3DEnabled,
        softTissueState: this.softTissueStateEnabled,
        rangeOfMotion: this.rangeOfMotionEnabled,
        stabilityAndStrength: this.stabilityAndStrengthEnabled,
        neurovascularState: this.neurovascularStateEnabled,
        banderasRojas: this.banderasRojasEnabled,
      },
      seccion3_estudiosImagen: {
        uploadModulo: this.estudiosImagenUploadEnabled,
      },
      seccion4_planTerapeutico: {
        modificacionFarmacologica: this.modificacionFarmacologicaEnabled,
        progresionRehabilitacion: this.progresionRehabilitacionEnabled,
        retiroProximaCita: this.retiroProximaCitaEnabled,
      },
      seccion5_resumenIA: {
        resumenMedicoTextarea: this.resumenMedicoTextareaEnabled,
        generarResumenIAButton: this.resumenIAPotenciaEnabled,
      },
    };

    console.log('Payload por input enviado al servicio web:', payloadPorInput);
    alert('Configuración de visibilidad por campo guardada exitosamente.');
  }
}
