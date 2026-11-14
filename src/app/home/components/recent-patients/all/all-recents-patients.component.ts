import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Calendar, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-angular';
import { AuthService } from '../../../../auth/auth.service';

@Component({
  selector: 'app-all-past-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './all-recent-patients.component.html'
})
export class AllPastPatientsComponent implements OnInit {
  private authService = inject(AuthService);

  readonly icons = { Search, Calendar, ChevronLeft, ChevronRight, ArrowLeft };

  // Lista completa de citas pasadas
  allPastPatients = signal<Array<any>>([]);

  // Estados de los filtros
  searchTerm = signal<string>('');
  selectedMonth = signal<string>(''); // Formato "YYYY-MM"
  selectedDate = signal<string>('');  // Formato "YYYY-MM-DD"

  // Paginación
  currentPage = signal<number>(1);
  pageSize = 10; // Citas por página

  ngOnInit(): void {
    this.loadAllPastPatients();
  }

  loadAllPastPatients() {
    const cached = this.authService.getCachedAppointments();
    const now = new Date();

    if (cached && cached.length > 0) {
      // 1. Filtrar solo citas pasadas
      const past = cached.filter((item: any) => {
        if (!item.date || !item.endTime) return false;
        return new Date(`${item.date}T${item.endTime}:00`) < now;
      });

      // 2. Ordenar de la más reciente a la más antigua
      const sorted = past.sort((a: any, b: any) => {
        return new Date(`${b.date}T${b.time || '00:00'}`).getTime() - new Date(`${a.date}T${a.time || '00:00'}`).getTime();
      });

      // 3. Mapear y formatear fechas
      const mapped = sorted.map((item: any) => {
        let formattedDate = item.date || '';
        if (item.date) {
          const [y, m, d] = item.date.split('-');
          const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          formattedDate = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        return {
          name: item.patientName || 'Sin nombre',
          reason: item.reason || 'Sin motivo especificado',
          date: item.date || '', // YYYY-MM-DD para filtros
          monthKey: item.date ? item.date.substring(0, 7) : '', // YYYY-MM para filtrar por mes
          formattedDate: `${formattedDate}, ${item.time || '00:00'}`,
          status: item.status || 'Completada',
          avatar: item.avatar || ''
        };
      });

      this.allPastPatients.set(mapped);
    }
  }

  // Citas filtradas por buscador, mes y día
  filteredPatients = computed(() => {
    const list = this.allPastPatients();
    const term = this.searchTerm().toLowerCase().trim();
    const month = this.selectedMonth();
    const date = this.selectedDate();

    return list.filter(item => {
      const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.reason.toLowerCase().includes(term);
      const matchesMonth = !month || item.monthKey === month;
      const matchesDate = !date || item.date === date;
      return matchesSearch && matchesMonth && matchesDate;
    });
  });

  // Citas paginadas según la página actual
  paginatedPatients = computed(() => {
    const filtered = this.filteredPatients();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  totalFilteredPages = computed(() => {
    return Math.ceil(this.filteredPatients().length / this.pageSize) || 1;
  });

  changePage(page: number) {
    if (page >= 1 && page <= this.totalFilteredPages()) {
      this.currentPage.set(page);
    }
  }

  // Evento para regresar a la vista anterior (puedes ajustarlo según tu sistema de rutas o estado)
  goBack() {
    window.history.back();
  }
}
