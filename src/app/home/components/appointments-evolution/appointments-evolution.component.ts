import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appointment-evolution',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments-evolution.component.html',
})
export class AppointmentsEvolutionComponent {
  appointments = input.required<any[]>();
  Math = Math;

  // Filtro por defecto: '30' (Último mes)
  filterMode = signal<string>('30');

  // Procesa y filtra las citas según el rango de días seleccionado
  filteredData = computed(() => {
    const rawAppointments = this.appointments() || [];
    const mode = this.filterMode();
    const now = new Date();

    // Calcular la fecha límite hacia atrás en milisegundos
    const daysBack = mode === '30' ? 30 : mode === '60' ? 60 : 90;
    const limitDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Filtrar citas dentro del rango de días
    const validAppointments = rawAppointments.filter((item: any) => {
      if (!item.date) return false;
      const dateObj = new Date(item.date);
      return !isNaN(dateObj.getTime()) && dateObj >= limitDate && dateObj <= now;
    });

    const groups: Record<
      string,
      { completed: number; pending: number; cancelled: number; total: number; label: string }
    > = {};

    // Inicializar contenedores de tiempo agrupados por fecha
    validAppointments.forEach((item: any) => {
      const dateObj = new Date(item.date);
      const dateKey = dateObj.toISOString().split('T')[0];
      const monthNamesShort = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];

      const label = `${dateObj.getDate()} ${monthNamesShort[dateObj.getMonth()]}`;

      if (!groups[dateKey]) {
        groups[dateKey] = { completed: 0, pending: 0, cancelled: 0, total: 0, label };
      }

      // Mapeo según los estatus numéricos indicados:
      // 0 = Sin confirmar
      // 1 = Confirmado (Exitosas)
      // 2 = Cancelado
      const statusCode = Number(item.status);

      if (statusCode === 1) {
        groups[dateKey].completed++;
      } else if (statusCode === 2) {
        groups[dateKey].cancelled++;
      } else {
        groups[dateKey].pending++;
      }
      groups[dateKey].total++;
    });

    // Ordenar cronológicamente
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map((key, index) => ({
      monthIndex: index,
      month: groups[key].label,
      completed: groups[key].completed,
      pending: groups[key].pending,
      cancelled: groups[key].cancelled,
      total: groups[key].total,
      isCurrentMonth: index === sortedKeys.length - 1,
    }));
  });

  // Total acumulado en el periodo seleccionado
  totalPeriodPatients = computed(() => {
    return this.filteredData().reduce((acc, curr) => acc + curr.total, 0);
  });

  onFilterChange(event: any) {
    const val = event.target.value;
    this.filterMode.set(val);
  }

  getMaxVal(): number {
    const data = this.filteredData();
    if (!data || data.length === 0) return 1;
    return Math.max(
      ...data.map((d: any) => Math.max(d.completed, d.pending, d.cancelled, d.total)),
      1,
    );
  }

  // Cálculo de la altura de las barras en porcentaje
  getBarHeightPercentage(value: number): string {
    const maxVal = this.getMaxVal();
    if (maxVal === 0) return '0%';
    const percentage = (value / maxVal) * 100;
    return `${Math.min(percentage, 100)}%`;
  }

  getCurvePath(accessor: (d: any) => number): string {
    const data = this.filteredData();
    if (!data || data.length === 0) return '';
    const maxVal = this.getMaxVal();
    const width = 600;
    const height = 90;

    const points = data.map((d: any, index: number) => {
      const x = (index / (data.length - 1 || 1)) * (width - 40) + 20;
      const y = height - (accessor(d) / maxVal) * (height - 20);
      return { x, y };
    });

    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      path += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }
}
