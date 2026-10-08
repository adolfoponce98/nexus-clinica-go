import { Component, input, signal, computed } from '@angular/core';
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

  filterMode = signal<number>(6); // 6 o 12 meses
  page = signal<number>(0);       // 0 para bloque anterior/primeros 6, 1 için bloque actual/últimos 6

  monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Total acumulado de pacientes en el año
  totalYearPatients = computed(() => {
    const raw = this.data();
    return Object.values(raw).reduce((acc: any, val: any) => acc + (Number(val) || 0), 0);
  });

  // Arreglo completo con los 12 meses del año
  fullYearData = computed(() => {
    const raw = this.data();
    const currentDate = new Date(); // Octubre 2026
    const currentMonthIndex = currentDate.getMonth(); // 9 (Octubre)

    // Encontrar el valor máximo para calcular proporciones de spacing dinámico
    const values = Object.values(raw).map(v => Number(v) || 0);
    const maxVal = Math.max(...values, 1);

    return this.monthsNames.map((name, index) => {
      const monthNum = index + 1;
      const total = Number(raw[monthNum]) || 0;

      // Cálculo proporcional de la altura visual (spacing)
      const heightPx = Math.round((total / maxVal) * 90);
      const spacing = `${Math.max(heightPx, 4)}px`;

      return {
        monthIndex: index,
        month: name,
        total: total,
        spacing: spacing,
        isCurrentMonth: index === currentMonthIndex
      };
    });
  });

  // Filtrado y paginación según los últimos 6 meses o año completo
  displayedData = computed(() => {
    const allMonths = this.fullYearData();
    const mode = this.filterMode();

    if (mode === 12) {
      return allMonths;
    }

    // Lógica para "Últimos 6 meses": calculamos terminando en el mes actual (Octubre = índice 9)
    // 5 hacia atrás incluyendo el actual -> Mayo (4) hasta Octubre (9)
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth(); // 9

    if (this.page() === 1) {
      // Últimos 6 meses (ej. May - Oct)
      const start = Math.max(0, currentMonthIndex - 5);
      return allMonths.slice(start, currentMonthIndex + 1);
    } else {
      // Primeros 6 meses del bloque anterior (ej. Ene - Abr / o los 6 anteriores)
      const end = Math.max(0, currentMonthIndex - 5);
      const start = Math.max(0, end - 6);
      return allMonths.slice(start, end > start ? end : start + 6);
    }
  });

  onFilterChange(event: any) {
    const val = Number(event.target.value);
    this.filterMode.set(val);
    this.page.set(1); // Resetea a la página más reciente
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
}
