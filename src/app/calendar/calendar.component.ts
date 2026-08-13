import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-angular';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

interface ClassSchedule {
  time: string;
  coach: string;
  name: string;
  date: string; // YYYY-MM-DD
  colorHex?: string; // Color dinámico del coach
}

interface CoachModel {
  name: string;
  colorHex: string;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
  readonly icons = { ChevronLeft, ChevronRight, CalendarIcon, Clock, User };

  currentView = signal<'month' | 'week' | 'day'>('month');
  selectedDate = new Date();
  
  monthClasses = signal<ClassSchedule[]>([]);
  coachesList: CoachModel[] = [];
  isLoading = false;

  idBranch = 'BEAST-TESISTAN';

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

  // 1. Cargar la lista de empleados/coaches desde Firestore
  async loadCoaches() {
    const db = getFirestore();
    const employesRef = collection(db, `employes/${this.idBranch}/employes`);

    
    
    try {
      const snapshot = await getDocs(employesRef);
      this.coachesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: data['name'] || '',
          colorHex: data['colorHex'] || '#71717a' // Gris por defecto si no tiene color
        };
      });
    } catch (error) {
      console.error('Error al cargar coaches:', error);
    }
  }

  // Buscar el color del coach por su nombre
  getCoachColor(coachName: string): string {
    const found = this.coachesList.find(c => c.name.toLowerCase() === coachName.toLowerCase());
    return found ? found.colorHex : '#71717a'; // Zinc por defecto
  }

  // 2. Cargar los horarios y asociarles el color del coach
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
            colorHex: this.getCoachColor(coachName) // Asignamos el color obtenido del coach
          });
        });
      }

      this.monthClasses.set(loadedClasses);
    } catch (error) {
      console.error('Error al cargar horarios:', error);
    }
  }

  // --- GENERADOR DE VISTAS ---
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

      week.push({
        name: nextDay.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        dateStr,
        classes: this.monthClasses().filter(c => c.date === dateStr)
      });
    }
    return week;
  }

  get currentDayClasses() {
    const year = this.selectedDate.getFullYear();
    const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = this.selectedDate.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    return this.monthClasses()
      .filter(c => c.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  formatDateHeader(): string {
    return this.selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}