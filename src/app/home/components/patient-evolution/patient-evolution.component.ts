import { Component, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-patient-evolution',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-evolution.component.html'
})
export class PatientEvolutionComponent {
  // Recibe un diccionario o arreglo mapeado de los 12 meses { [monthNumber]: total }
  data = input.required<Record<number, number>>();
  Math = Math;
  filterMode = signal<number>(6); // 6 o 12 meses
  page = signal<number>(new Date().getMonth() >= 6 ? 1 : 0);

  monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  constructor() {
    // Effect para forzar la actualización reactiva cada vez que el input 'data' cambie o se carguen los datos del servidor
    effect(() => {
      const raw = this.data();
      if (raw) {
        // Dispara la reactividad de las señales internas cuando llegan los datos nuevos
        this.page.update(p => p);
      }
    });
  }

  // Total acumulado de pacientes en el año
  totalYearPatients = computed(() => {
    const raw = this.data();
    if (!raw) return 0;
    return Object.values(raw).reduce((acc: any, val: any) => acc + (Number(val) || 0), 0);
  });

  // Arreglo completo con los 12 meses del año
  fullYearData = computed(() => {
    const raw = this.data() || {};
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();

    return this.monthsNames.map((name, index) => {
      const monthNum = index + 1;
      const total = Number(raw[monthNum]) || 0;

      return {
        monthIndex: index,
        month: name,
        total: total,
        isCurrentMonth: index === currentMonthIndex
      };
    });
  });

  // Filtrado y paginación reactiva
  displayedData = computed(() => {
    const allMonths = this.fullYearData();
    const mode = this.filterMode();

    if (mode === 12) {
      return allMonths;
    }

    if (this.page() === 1) {
      return allMonths.slice(6, 12); // Semestre 2
    } else {
      return allMonths.slice(0, 6);  // Semestre 1
    }
  });

  onFilterChange(event: any) {
    const val = Number(event.target.value);
    this.filterMode.set(val);
    this.page.set(new Date().getMonth() >= 6 ? 1 : 0);
  }

  prevPage() {
    if (this.page() > 0) {
      this.page.update(p => p - 1);
    }
  }

  nextPage() {
    if (this.page() < 1) {
      this.page.update(p => p + 1);
    }
  }

  getMaxVal(): number {
    const data = this.displayedData();
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d: any) => d.total), 1);
  }

  getNodeBottomPosition(total: number): string {
    const maxVal = this.getMaxVal();
    if (maxVal === 0) return '10px';
    const percentage = (total / maxVal) * 75;
    return `calc(${percentage}% + 15px)`;
  }

  getWavePath(data: any[], offsetY: number = 0): string {
    if (!data || data.length === 0) return '';
    const maxVal = this.getMaxVal();
    const width = 600;
    const height = 90;

    const points = data.map((d: any, index: number) => {
      const x = (index / (data.length - 1 || 1)) * (width - 40) + 20;
      const y = height - (d.total / maxVal) * (height - 20) + offsetY;
      return { x, y };
    });

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    return path;
  }

  getConvergingWavePath(data: any[], spread: number = 0): string {
    if (!data || data.length === 0) return '';
    const maxVal = this.getMaxVal();
    const width = 600;
    const height = 90;

    const points = data.map((d: any, index: number) => {
      const x = (index / (data.length - 1 || 1)) * (width - 40) + 20;
      const y = height - (d.total / maxVal) * (height - 20);
      return { x, y };
    });

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      const cpY0 = p0.y + spread;
      const cpY1 = p1.y + spread;

      path += ` C ${cpX} ${cpY0}, ${cpX} ${cpY1}, ${p1.x} ${p1.y}`;
    }

    return path;
  }
}
