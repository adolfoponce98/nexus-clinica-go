import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-recent-patients',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './recent-patients.component.html'
})
export class RecentPatientsComponent {
  readonly ChevronRight = ChevronRight;

  // Recibe la lista completa desde el Home
  patients = input.required<Array<any>>();
  viewAllClicked = output<void>();

  onViewAll() {
    this.viewAllClicked.emit();
  }

  // Computed que procesa el historial, ordena de la más reciente a la más vieja y toma 5
  processedPatients = computed(() => {
    const rawList = this.patients();
    if (!rawList || rawList.length === 0) return [];

    // Ordenar de la más reciente a la más antigua (descendente por fecha y hora)
    const sorted = [...rawList].sort((a, b) => {
      const dateTimeA = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}:00`).getTime();
      const dateTimeB = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}:00`).getTime();
      return dateTimeB - dateTimeA;
    });

    // Tomar los últimos 5 y formatear sus propiedades
    return sorted.slice(0, 5).map((item) => {
      let formattedDate = item.lastConsult || 'Fecha por definir';
      if (item.date) {
        const [year, month, day] = item.date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dateReadable = dateObj.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        formattedDate = `${dateReadable}, ${item.time || '00:00'}`;
      }

      // Mapeo estricto de estatus numéricos:
      // 0 = Sin confirmar
      // 1 = Confirmada / Completada
      // 2 = Cancelada
      const statusCode = Number(item.status);
      let statusText = 'Sin confirmar';
      let statusClass = 'Sin confirmar';

      if (statusCode === 1 || item.status === 'Completada' || item.status === 'Tomada') {
        statusText = 'Completada';
        statusClass = 'Completada';
      } else if (statusCode === 2 || item.status === 'Cancelada') {
        statusText = 'Cancelada';
        statusClass = 'Cancelada';
      } else if (statusCode === 0 || item.status === 'Sin confirmar') {
        statusText = 'Sin confirmar';
        statusClass = 'Sin confirmar';
      }

      return {
        ...item,
        statusText,
        statusClass,
        lastConsultFormatted: formattedDate,
        reason: item.specialty || item.reason || 'Sin motivo especificado'
      };
    });
  });
}
