import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, Activity, Users, Clock, Trophy, User,Maximize2, Minimize2 } from 'lucide-angular';
import { collection, onSnapshot, Unsubscribe, getFirestore } from 'firebase/firestore';
import { Chart, registerables, Plugin } from 'chart.js';

Chart.register(...registerables);

interface StudentHeartData {
  id: string;
  name: string;
  heartRate: number;
  percentage: number;
  photoUrl?: string;
}

interface StudentAnimationState {
  currentBpm: number;
  targetBpm: number;
  startBpm: number;
  progress: number;
  stepsTotal: number;
  photoUrl?: string;
}

@Component({
  selector: 'app-heart-monitor',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './heart-monitor.component.html'
})
export class HeartMonitorComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly icons = { Heart, Activity, Users, Clock, Trophy, User,Maximize2,Minimize2 };

  @ViewChild('heartChart') chartRef!: ElementRef;
  private chart!: Chart;

  idBranch = 'BEAST-TESISTAN';
  studentsTableData: StudentHeartData[] = [];

  private unsubMonitor?: Unsubscribe;
  private studentStates = new Map<string, StudentAnimationState>();
  private animationInterval: any;
  private profileImagesCache = new Map<string, HTMLImageElement>(); // Caché para las imágenes de perfil

  currentDateStr = '';
  currentMonthStr = '';
  currentHourSlot = '';

  readonly bpmMin = 90;
  readonly bpmMax = 190;
  readonly maxFcWoman30 = 190;
isFullscreen = false;
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initDynamicDateTime();
    this.setupRealtimeMonitor();
    this.startSmoothAnimationLoop();
  }

ngAfterViewInit() {
    setTimeout(() => {
      this.initChart();
      // Forzar un redimensionamiento inmediato una vez montado para ajustar el arcoíris
      if (this.chart) {
        this.chart.resize();
        this.chart.update('none');
      }
    }, 100);

    // Escuchar cambios de tamaño de ventana globalmente
    window.addEventListener('resize', this.onWindowResize);
  }

  // Manejador para reescalar la gráfica fluidamente ante cualquier cambio de tamaño
  private onWindowResize = () => {
    if (this.chart) {
      this.chart.resize();
      this.chart.update('none');
    }
  };
 ngOnDestroy() {
    if (this.unsubMonitor) this.unsubMonitor();
    if (this.animationInterval) clearInterval(this.animationInterval);
    window.removeEventListener('resize', this.onWindowResize);
    if (this.chart) this.chart.destroy();
  }

  initDynamicDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');

 this.currentMonthStr = `2026-08`;
    this.currentDateStr = `2026-08-12`;
    this.currentHourSlot = `08:00`;
  }
toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;

    // Forzar redimensionamiento y actualización inmediata del canvas para que el arcoíris se adapte
    setTimeout(() => {
      if (this.chart) {
        this.chart.resize();
        this.chart.update('none');
      }
    }, 50); // Un pequeño delay de 50ms asegura que el DOM ya haya aplicado los estilos de pantalla completa
  }
  // Función auxiliar para dibujar un corazón vectorial en el canvas
  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    // Curva superior izquierda
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    // Curva inferior izquierda hacia la punta
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + size, x, y + size);
    // Curva inferior derecha hacia arriba
    ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    // Curva superior derecha
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  initChart() {
    if (!this.chartRef) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');

    const monitorCustomPlugin: Plugin = {
      id: 'monitorCustomPlugin',
      beforeDraw: (chart) => {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;
        if (!y) return;
        ctx.save();

        const zones = [
          { min: 171, max: 190, color: 'rgba(239, 68, 68, 0.22)' },
          { min: 152, max: 171, color: 'rgba(248, 113, 113, 0.22)' },
          { min: 133, max: 152, color: 'rgba(249, 115, 22, 0.22)' },
          { min: 114, max: 133, color: 'rgba(16, 185, 129, 0.22)' },
          { min: 95,  max: 114, color: 'rgba(56, 189, 248, 0.22)' },
          { min: 90,  max: 95,  color: 'rgba(113, 113, 122, 0.22)' }
        ];

        zones.forEach(zone => {
          const yTop = y.getPixelForValue(zone.max);
          const yBottom = y.getPixelForValue(zone.min);
          ctx.fillStyle = zone.color;
          ctx.fillRect(left, Math.max(top, yTop), right - left, Math.min(bottom, yBottom) - Math.max(top, yTop));
        });

        ctx.restore();
      },
   afterDatasetsDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        ctx.textBaseline = 'middle';

        // Obtener el nombre del primer lugar actual directamente del ranking oficial de la tabla
        const firstPlaceName = this.studentsTableData.length > 0 ? this.studentsTableData[0].name : null;

        const activeLabels: { name: string; bpm: number; x: number; y: number; color: string; photoUrl?: string }[] = [];

        chart.data.datasets.forEach((dataset: any, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta.hidden && meta.data && meta.data.length > 0) {
            let lastPoint: any = null;
            let lastValue: number | null = null;

            for (let i = meta.data.length - 1; i >= 0; i--) {
              if (dataset.data[i] !== null && meta.data[i]) {
                lastPoint = meta.data[i];
                lastValue = Math.round(dataset.data[i]);
                break;
              }
            }

            if (lastPoint && lastPoint.x !== undefined && lastPoint.y !== undefined && lastValue !== null) {
              const state = this.studentStates.get(dataset.label);
              const strokeColor = typeof dataset.borderColor === 'string' ? dataset.borderColor : '#f43f5e';

              activeLabels.push({
                name: dataset.label || '',
                bpm: lastValue,
                x: lastPoint.x,
                y: lastPoint.y,
                color: strokeColor,
                photoUrl: state?.photoUrl
              });
            }
          }
        });

        // Anti-solapamiento y Renderizado de Cabezas + Aura Brillante dinámica para el 1er lugar real
        activeLabels.forEach((item, index) => {
          let yOffset = 0;
          let xOffset = 22;

          for (let j = 0; j < index; j++) {
            const prev = activeLabels[j];
            const distanceY = Math.abs(item.y - prev.y);
            const distanceX = Math.abs(item.x - prev.x);

            if (distanceY < 30 && distanceX < 15) {
              yOffset = (index % 2 === 0 ? 1 : -1) * (18 * Math.ceil(index / 2));
              xOffset += 14 * index;
            }
          }

          const finalX = item.x + xOffset;
          const finalY = item.y + yOffset;
          const bpmText = `${item.bpm} BPM`;

          // VALIDACIÓN DINÁMICA: ¿Es esta alumna el primer lugar absoluto actual?
          const isLeader = item.name === firstPlaceName;

          // SI ES EL LÍDER ACTUAL, DIBUJAR AURA Y DESTELLOS BRILLANTES
          if (isLeader) {
            this.drawBrightAuraEffect(ctx, item.x, item.y, 34);
          }

          // 1. DIBUJAR CABEZA (FOTO CIRCULAR O CORAZÓN)
          ctx.save();
          const avatarRadius = 26;

          if (item.photoUrl) {
            let img = this.profileImagesCache.get(item.photoUrl);
            if (!img) {
              img = new Image();
              img.crossOrigin = 'anonymous';
              img.src = item.photoUrl;
              this.profileImagesCache.set(item.photoUrl, img);
            }

            if (img.complete && img.naturalWidth !== 0) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(item.x, item.y, avatarRadius, 0, Math.PI * 2, true);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(img, item.x - avatarRadius, item.y - avatarRadius, avatarRadius * 2, avatarRadius * 2);
              ctx.restore();

              ctx.beginPath();
              ctx.arc(item.x, item.y, avatarRadius, 0, Math.PI * 2, true);
              ctx.lineWidth = 2.5;
              // Si es el líder actual, el borde se pinta de color ámbar/oro brillante
              ctx.strokeStyle = isLeader ? '#f59e0b' : item.color;
              ctx.stroke();
            } else {
              this.drawHeart(ctx, item.x, item.y - 12, 26, item.color);
            }
          } else {
            this.drawHeart(ctx, item.x, item.y - 12, 26, item.color);
          }
          ctx.restore();

          // 2. DIBUJAR ETIQUETA VERTICAL (NOMBRE Y BPM)
          ctx.save();
          ctx.translate(finalX, finalY);


          ctx.font = 'bold 18px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(item.name, 10, -14);

          ctx.font = 'bold 24px monospace';
          // Si es el líder actual, el texto de BPM destaca en color ámbar brillante
          ctx.fillStyle = isLeader ? '#f59e0b' : '#f43f5e';
          ctx.fillText(bpmText, 10, 10);

          ctx.restore();
        });

        ctx.restore();
      }
    };

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      plugins: [monitorCustomPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          y: {
            position: 'left',
            min: this.bpmMin,
            max: this.bpmMax,
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            ticks: { color: '#a1a1aa', font: { family: 'monospace', weight: 'bold' }, callback: (v) => `${v} BPM` },
            title: { display: true, text: 'PPM (Pulsaciones por Minuto)', color: '#71717a', font: { size: 10, weight: 'bold' } }
          },
          y1: {
            position: 'right',
            min: 50,
            max: 100,
            grid: { display: false },
            ticks: { color: '#a1a1aa', font: { family: 'monospace', weight: 'bold' }, callback: (v) => `${v}%` },
            title: { display: true, text: '% Frecuencia Cardíaca', color: '#71717a', font: { size: 10, weight: 'bold' } }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#a1a1aa',
              font: { family: 'monospace' },
              callback: (val: string | number, index: number, ticks: any[]) => {
                if (index % 5 === 0 || index === ticks.length - 1) {
                  const label = this.chart?.data?.labels?.[val as number];
                  return label ? String(label) : '';
                }
                return '';
              }
            }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  setupRealtimeMonitor() {
    const db = getFirestore();
    const monitorRef = collection(
      db, 'heartMonitor', this.idBranch, 'meses', this.currentMonthStr, 'dias', this.currentDateStr, 'sessiones', this.currentHourSlot, 'heart_monitor'
    );

    this.unsubMonitor = onSnapshot(monitorRef, (snapshot) => {
      let activeNames = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = data['name'] || 'Alumna';
        const rawHr = Number(data['heartRate']) || 95;
        const hr = Math.min(Math.max(rawHr, this.bpmMin), this.bpmMax);
        const photoUrl = data['photoUrl'] || data['photo'] || ''; // Campo de la URL de perfil

        activeNames.add(name);

        if (!this.studentStates.has(name)) {
          this.studentStates.set(name, {
            currentBpm: hr,
            targetBpm: hr,
            startBpm: hr,
            progress: 1,
            stepsTotal: 15,
            photoUrl: photoUrl
          });
        } else {
          const state = this.studentStates.get(name)!;
          state.startBpm = state.currentBpm;
          state.targetBpm = hr;
          state.progress = 0;
          state.photoUrl = photoUrl;
        }
      });

      this.studentStates.forEach((_, name) => {
        if (!activeNames.has(name)) {
          this.studentStates.delete(name);
        }
      });
    });
  }

  startSmoothAnimationLoop() {
    this.animationInterval = setInterval(() => {
      this.updateChartTick();
    }, 1000);
  }

  updateChartTick() {
    let tableData: StudentHeartData[] = [];

    this.studentStates.forEach((state, name) => {
      if (state.progress < 1) {
        state.progress += 1 / state.stepsTotal;
        if (state.progress > 1) state.progress = 1;
        state.currentBpm = state.startBpm + (state.targetBpm - state.startBpm) * state.progress;
      }

      const roundedBpm = Math.round(state.currentBpm);
      const pct = Math.round((roundedBpm / this.maxFcWoman30) * 100);

      tableData.push({
        id: name,
        name: name,
        heartRate: roundedBpm,
        percentage: pct,
        photoUrl: state.photoUrl
      });
    });

    tableData.sort((a, b) => b.percentage - a.percentage);
    this.studentsTableData = tableData;
    this.cdr.detectChanges();

    if (!this.chart) return;

    const timestampLabel = new Date().toLocaleTimeString();
    const windowSize = 15;
    const targetIndex = 11;

    if (!this.chart.data.labels) {
      this.chart.data.labels = [];
    }

    this.chart.data.labels.push(timestampLabel);
    if (this.chart.data.labels.length > windowSize) {
      this.chart.data.labels.shift();
    }

    const colors = ['#f43f5e', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];
    const activeNames = Array.from(this.studentStates.keys());

    this.chart.data.datasets = this.chart.data.datasets.filter((d: any) => activeNames.includes(d.label));

    let colorIndex = 0;
    this.studentStates.forEach((state, name) => {
      const color = colors[colorIndex % colors.length];
      colorIndex++;

      let dataset: any = this.chart.data.datasets.find((d: any) => d.label === name);

      if (!dataset) {
        const ctx = this.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.7, color);

        dataset = {
          label: name,
          data: [],
          borderColor: gradient,
          backgroundColor: 'transparent',
          borderWidth: 3,
          borderDash: [],
          tension: 0.4,
          fill: false,
          shadowColor: color,
          shadowBlur: 15,
          pointRadius: 0, // Desactivamos el punto estándar de Chart.js ya que dibujamos la foto o el corazón manualmente
          pointHoverRadius: 8,
          _rawHistory: []
        };
        this.chart.data.datasets.push(dataset);
      }

      if (!dataset._rawHistory) {
        dataset._rawHistory = [];
      }
      dataset._rawHistory.push(state.currentBpm);

      const maxHistoryAllowed = Math.min(this.chart.data.labels?.length || 0, targetIndex + 1);
      if (dataset._rawHistory.length > maxHistoryAllowed) {
        if (dataset._rawHistory.length > targetIndex + 1) {
          dataset._rawHistory.shift();
        }
      }
    });

    const currentLabelsLength = this.chart.data.labels.length;

    this.chart.data.datasets.forEach((dataset: any) => {
      const history = dataset._rawHistory || [];
      const newDataSetData = new Array(currentLabelsLength).fill(null);

      const trailLength = 5;
      const startIndex = Math.max(0, history.length - trailLength);

      for (let i = startIndex; i < history.length; i++) {
        const pos = history.length <= targetIndex ? i : (targetIndex - (history.length - 1 - i));
        if (pos >= 0 && pos < currentLabelsLength) {
          newDataSetData[pos] = history[i];
        }
      }

      dataset.data = newDataSetData;
    });

    this.chart.update('none');
  }

  getBadgeColor(percentage: number): string {
    if (percentage < 60) return 'bg-zinc-700/20 text-zinc-300 border-zinc-600/30';
    if (percentage < 70) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    if (percentage < 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (percentage < 90) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (percentage < 100) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    return 'bg-red-600/30 text-red-400 border-red-500/50 animate-pulse';
  }

// Función para dibujar un efecto brillante, aura de luz y destellos estelares para el 1er lugar
  private drawBrightAuraEffect(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    ctx.save();
    const time = Date.now() * 0.003; // Velocidad de pulsación del brillo

    // 1. Aura exterior pulsante (Resplandor dorado / ámbar brillante)
    const pulseRadius = radius + 6 + Math.sin(time * 4) * 3;
    const gradient = ctx.createRadialGradient(x, y, radius, x, y, pulseRadius);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.8)'); // Centro dorado brillante
    gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.4)'); // Transición suave
    gradient.addColorStop(1, 'transparent'); // Difuminado exterior

    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 2. Destellos estelares / partículas brillantes orbitando alrededor
    const starCount = 6;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + (time * 1.5);
      const orbitDist = radius + 8 + Math.sin(time * 2 + i) * 2;
      const sx = x + Math.cos(angle) * orbitDist;
      const sy = y + Math.sin(angle) * orbitDist;

      // Dibujar pequeña estrella / destello brillante
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; // Núcleo blanco puro
      ctx.shadowColor = '#fbbf24'; // Brillo ámbar
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.restore();
  }
}
