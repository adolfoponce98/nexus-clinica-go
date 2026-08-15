import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, X } from 'lucide-angular';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

interface ClassSchedule {
  time: string;
  coach: string;
  name: string;
  date: string; // YYYY-MM-DD
  colorHex?: string;
}

interface TeacherResponse {
  idDocumentFirebase: string;
  branchId: string;
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string;
  hireDate?: string;
  colorHex: string;
  photoUrl?: string;
  description?: string;
  skills: string[];
}

interface InfoClase {
  id?: number;
  coach: string;
  idCoach: string;
  name: string;
  time: string;
  duration: number;
  level: number;
  aggended: number;
  total: number;
  photo: string;
  color: string;
}

interface InfoClassItem {
  horario: string;
  infoClase: InfoClase;
}

// Estructura para almacenar el horario seleccionado junto con el maestro que lo eligió
interface SelectedBatchSlot {
  horario: string;
  coach: TeacherResponse;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LucideAngularModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
  private http = inject(HttpClient);

  readonly icons = { ChevronLeft, ChevronRight, CalendarIcon, Clock, User, Plus, X };

  currentView = signal<'month' | 'week' | 'day'>('month');
  selectedDate = new Date();

  monthClasses = signal<ClassSchedule[]>([]);
  coachesList: TeacherResponse[] = [];
  isLoading = false;
  idBranch = 'BEAST-TESISTAN';

  // --- ESTADOS PARA LOS DIÁLOGOS ---
  showBatchModal = false;
  showIndividualModal = false;

  batchTargetDate = '';
  selectedCoachForBatch: TeacherResponse | null = null;

  // Lista de horarios seleccionados en lote con su respectivo coach asignado
  selectedBatchSlots = signal<SelectedBatchSlot[]>([]);

  availableHoursCatalog = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  // Datos para el diálogo individual
  individualTargetDate = '';
  individualTargetHour = '';
  selectedCoachForIndividual: TeacherResponse | null = null;

  ngOnInit() {
    this.loadData();
  }

  get currentMonthYearLabel(): string {
    return this.selectedDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  navigate(direction: number) {
    const d = new Date(this.selectedDate);
    if (this.currentView() === 'month') {
      d.setMonth(d.getMonth() + direction);
    } else if (this.currentView() === 'week') {
      d.setDate(d.getDate() + (direction * 7));
    } else {
      d.setDate(d.getDate() + direction);
    }
    this.selectedDate = d;
    this.loadMonthSchedules();
  }

  async loadData() {
    this.isLoading = true;
    await this.loadCoaches();
    await this.loadMonthSchedules();
    this.isLoading = false;
  }

  async loadCoaches() {
    const url = 'https://getemployesbybranch-rdotx3vmaq-uc.a.run.app';
    const body = { branchId: this.idBranch };

    this.http.post<any>(url, body).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.coachesList = response.teachers || [];
          if (this.coachesList.length > 0) {
            this.selectedCoachForBatch = this.coachesList[0];
            this.selectedCoachForIndividual = this.coachesList[0];
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar coaches desde API:', err);
      }
    });
  }

  getCoachColor(coachName: string): string {
    const found = this.coachesList.find(c => c.name.toLowerCase() === coachName.toLowerCase());
    return found ? found.colorHex : '#71717a';
  }

  async loadMonthSchedules() {
    const db = getFirestore();
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const yearMonthKey = `${year}-${month}`;

    const diasRef = collection(db, `classes/studios/${this.idBranch}/${yearMonthKey}/dias`);

    try {
      const diasSnap = await getDocs(diasRef);
      let loadedClasses: ClassSchedule[] = [];

      for (const diaDoc of diasSnap.docs) {
        const fechaDia = diaDoc.id;
        const schedulesRef = collection(diasRef, fechaDia, 'SCHEDULES');
        const schedulesSnap = await getDocs(schedulesRef);

        schedulesSnap.forEach(schDoc => {
          const data = schDoc.data();
          const coachName = data['coach'] || 'Sin coach';

          loadedClasses.push({
            time: schDoc.id,
            coach: coachName,
            name: data['name'] || 'Clase General',
            date: fechaDia,
            colorHex: this.getCoachColor(coachName)
          });
        });
      }

      this.monthClasses.set(loadedClasses);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    }
  }

  // --- MÉTODOS PARA ASIGNACIÓN EN LOTE CON MÚLTIPLES COACHES ---
  openBatchModal(dateStr: string) {
    this.batchTargetDate = dateStr;
    this.selectedBatchSlots.set([]);
    if (this.coachesList.length > 0) {
      this.selectedCoachForBatch = this.coachesList[0];
    }
    this.showBatchModal = true;
  }

  // Obtener qué coach tiene asignado un horario en el lote actual (si ya fue seleccionado)
  getSlotCoach(hora: string): TeacherResponse | undefined {
    const found = this.selectedBatchSlots().find(s => s.horario === hora);
    return found ? found.coach : undefined;
  }

  toggleBatchHour(hora: string) {
    if (!this.selectedCoachForBatch) return;

    const current = this.selectedBatchSlots();
    const existingIndex = current.findIndex(s => s.horario === hora);

    if (existingIndex > -1) {
      // Si ya estaba seleccionado, lo quitamos
      this.selectedBatchSlots.set(current.filter(s => s.horario !== hora));
    } else {
      // Si no estaba, lo agregamos asociado al maestro activo actualmente
      this.selectedBatchSlots.set([...current, { horario: hora, coach: this.selectedCoachForBatch }]);
    }
  }

  saveBatchSchedule() {
    const slots = this.selectedBatchSlots();
    if (slots.length === 0) {
      alert('Selecciona al menos un horario.');
      return;
    }

    const horariosArray: InfoClassItem[] = slots.map(slot => ({
      horario: slot.horario,
      infoClase: {
        id: 0,
        coach: slot.coach.name,
        idCoach: slot.coach.id || slot.coach.idDocumentFirebase,
        name: 'Por definir',
        time: slot.horario,
        duration: 50,
        level: 1,
        aggended: 0,
        total: 0,
        photo: slot.coach.photoUrl || '',
        color: slot.coach.colorHex
      }
    }));

    const payload = {
      idSucursal: this.idBranch,
      dia: this.batchTargetDate,
      horarios: horariosArray
    };

    const apiUrl = 'https://registerstudioschedules-rdotx3vmaq-uc.a.run.app';
    this.http.post(apiUrl, payload).subscribe({
      next: () => {
        alert('Horarios en lote guardados con éxito.');
        this.showBatchModal = false;
        this.loadMonthSchedules();
      },
      error: (err) => {
        console.error('Error al guardar horarios en lote:', err);
        alert('Error al registrar los horarios.');
      }
    });
  }

  // --- MÉTODOS PARA ASIGNACIÓN INDIVIDUAL ---
  openIndividualModal(dateStr: string, hour: string) {
    this.individualTargetDate = dateStr;
    this.individualTargetHour = hour;
    if (this.coachesList.length > 0) {
      this.selectedCoachForIndividual = this.coachesList[0];
    }
    this.showIndividualModal = true;
  }

  saveIndividualSchedule() {
    if (!this.selectedCoachForIndividual) {
      alert('Selecciona un maestro.');
      return;
    }

    const horarioItem: InfoClassItem = {
      horario: this.individualTargetHour,
      infoClase: {
        id: 0,
        coach: this.selectedCoachForIndividual.name,
        idCoach: this.selectedCoachForIndividual.id || this.selectedCoachForIndividual.idDocumentFirebase,
        name: 'Por definir',
        time: this.individualTargetHour,
        duration: 50,
        level: 1,
        aggended: 0,
        total: 0,
        photo: this.selectedCoachForIndividual.photoUrl || '',
        color: this.selectedCoachForIndividual.colorHex
      }
    };

    const payload = {
      idSucursal: this.idBranch,
      dia: this.individualTargetDate,
      horarios: [horarioItem]
    };

    const apiUrl = 'https://registerstudioschedules-rdotx3vmaq-uc.a.run.app';
    this.http.post(apiUrl, payload).subscribe({
      next: () => {
        alert('Clase asignada con éxito.');
        this.showIndividualModal = false;
        this.loadMonthSchedules();
      },
      error: (err) => {
        console.error('Error al guardar clase individual:', err);
        alert('Error al registrar la clase.');
      }
    });
  }

  // --- GENERADORES DE VISTAS Y HORARIOS DISPONIBLES ---
  get daysInMonthGrid() {
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    let days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: '', dateStr: '', classes: [] });
    }
    for (let i = 1; i <= totalDays; i++) {
      const dayStr = i.toString().padStart(2, '0');
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const classesForDay = this.monthClasses().filter(c => c.date === dateStr);
      days.push({ dayNumber: i, dateStr, classes: classesForDay });
    }
    return days;
  }

 // --- GENERADORES DE VISTAS ACTUALIZADOS ---

  // Vista Semanal con lista unificada y ordenada cronológicamente por hora
  get weekDaysGrid() {
    const current = new Date(this.selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));

    let week = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      const year = nextDay.getFullYear();
      const month = (nextDay.getMonth() + 1).toString().padStart(2, '0');
      const dayStr = nextDay.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;

      const existingClasses = this.monthClasses().filter(c => c.date === dateStr);
      const scheduledTimes = existingClasses.map(c => c.time);

      // Creamos elementos unificados: las clases y los huecos libres
      let unifiedItems: Array<{ time: string, isAssigned: boolean, classData?: ClassSchedule }> = [];

      // Añadimos todas las horas del catálogo y las marcamos según estén ocupadas o libres
      this.availableHoursCatalog.forEach(hora => {
        const foundClass = existingClasses.find(c => c.time === hora);
        if (foundClass) {
          unifiedItems.push({ time: hora, isAssigned: true, classData: foundClass });
        } else {
          // Opcional: si quieres mostrar solo las horas libres que estén dentro de un rango o todas. Aquí mostramos las libres.
          unifiedItems.push({ time: hora, isAssigned: false });
        }
      });

      // Ordenamos todo cronológicamente por la hora ('06:00', '07:00', etc.)
      unifiedItems.sort((a, b) => a.time.localeCompare(b.time));

      week.push({
        name: nextDay.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        dateStr,
        items: unifiedItems
      });
    }
    return week;
  }

  // Vista Diaria con lista unificada y ordenada
  get currentDayUnifiedData() {
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const existingClasses = this.monthClasses().filter(c => c.date === dateStr);

    let unifiedItems: Array<{ time: string, isAssigned: boolean, classData?: ClassSchedule }> = [];

    this.availableHoursCatalog.forEach(hora => {
      const foundClass = existingClasses.find(c => c.time === hora);
      if (foundClass) {
        unifiedItems.push({ time: hora, isAssigned: true, classData: foundClass });
      } else {
        unifiedItems.push({ time: hora, isAssigned: false });
      }
    });

    unifiedItems.sort((a, b) => a.time.localeCompare(b.time));

    return { dateStr, items: unifiedItems };
  }

  get currentDayClassesData() {
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const classes = this.monthClasses()
      .filter(c => c.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));

    const scheduledTimes = classes.map(c => c.time);
    const unassignedHours = this.availableHoursCatalog.filter(h => !scheduledTimes.includes(h));

    return { dateStr, classes, unassignedHours };
  }

  formatDateHeader(): string {
    return this.selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
