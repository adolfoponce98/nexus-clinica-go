import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-specialty-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './speciality-chart.component.html',
})
export class SpecialtyChartComponent {
  // Recibe la lista completa de motivos procesados
  data =
    input.required<Array<{ name: string; count: number; percentage: number; color: string }>>();

  // Estado para controlar la apertura del diálogo modal de pantalla completa
  isExpanded = signal<boolean>(false);

  toggleExpand(state: boolean) {
    this.isExpanded.set(state);
  }

  // Total global de todas las citas sumando los contadores de cada motivo
  totalCount = computed(() => {
    return this.data().reduce((acc, curr) => acc + curr.count, 0);
  });

  // Muestra únicamente los últimos 10 motivos para la vista compacta de la tarjeta principal
  displayedData = computed(() => {
    const list = this.data();
    return list.slice(-10); // Toma los últimos 10 elementos del arreglo
  });
}
