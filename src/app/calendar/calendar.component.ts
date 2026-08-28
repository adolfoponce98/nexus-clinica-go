import { Component, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { LucideAngularModule, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Plus, X, CheckCircle2 } from 'lucide-angular';
import { collection, getDocs, getFirestore, updateDoc, doc } from 'firebase/firestore';
import { AuthService } from '../auth/auth.service';
import { TypeClassModel } from '../home/home.model';
import { CalendarCacheService } from './calendar-cache.service';

interface ClassSchedule {
  time: string;
  coach: string;
  name: string;
  date: string; // YYYY-MM-DD
  colorHex?: string;
  level: number;
  cancelada?: boolean;
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

interface SelectedBatchSlot {
  horario: string;
  coach: TeacherResponse;
  isDelete?: boolean;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, LucideAngularModule],
  templateUrl: './calendar.component.html'
})
export class CalendarComponent implements OnInit {
private cacheService = inject(CalendarCacheService);
  constructor(private cdr: ChangeDetectorRef) {}

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  readonly icons = { ChevronLeft, ChevronRight, CalendarIcon, Clock, User, Plus, X, CheckCircle2 };

  currentView = signal<'month' | 'week' | 'day'>('month');
  selectedDate = new Date();

  // Modales
  showClassTypeModal = false;
  showSuccessModal = false; // <--- Nuevo diálogo de éxito
  selectedScheduleTarget: { dateStr: string, time: string } | null = null;
  selectedClassTypeItem: TypeClassModel | null = null;

  monthClasses = signal<ClassSchedule[]>([]);
  coachesList: TeacherResponse[] = [];
  isLoading = false;
  idBranch = 'BEAST-TESISTAN';
  weekScrollOffset = 0;

  showBatchModal = false;
  showIndividualModal = false;

  batchTargetDate = '';
  selectedCoachForBatch: TeacherResponse | null = null;
  selectedBatchSlots = signal<SelectedBatchSlot[]>([]);

  get availableHoursCatalog(): string[] {
    const sucursal = this.authService.getSucursal();
    if (sucursal && sucursal.branchInfo && sucursal.branchInfo.schedulersStudio) {
      return sucursal.branchInfo.schedulersStudio;
    }
    return [];
  }

  individualTargetDate = '';
  individualTargetHour = '';
  selectedCoachForIndividual: TeacherResponse | null = null;

  ngOnInit() {
    this.loadData();
  }

  get currentMonthYearLabel(): string {
    return this.selectedDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  get availableClassTypes(): TypeClassModel[] {
    const sucursal = this.authService.getSucursal();
    if (sucursal && sucursal.branchInfo && sucursal.branchInfo.typeClasses) {
      return sucursal.branchInfo.typeClasses;
    }
    return [];
  }



  // Confirmar y actualizar nivel y nombre de clase en Firestore y localmente
  async confirmAndUpdateClassLevel() {
    if (!this.selectedScheduleTarget || !this.selectedClassTypeItem) return;

    const { dateStr, time } = this.selectedScheduleTarget;
    const anioMes = dateStr.substring(0, 7);
    const nuevoNivel = Number(this.selectedClassTypeItem.dificultad);
    const nuevoNombre = this.selectedClassTypeItem.name;

    try {
      const db = getFirestore();
      const scheduleDocRef = doc(db, `classes/studios/${this.idBranch}/${anioMes}/dias/${dateStr}/SCHEDULES/${time}`);

      await updateDoc(scheduleDocRef, {
        level: nuevoNivel,
        name: nuevoNombre,
        updatedAt: new Date().toISOString()
      });

      // 🌟 Actualización local inmediata en memoria sin volver a consultar el servidor
      this.monthClasses.update(currentList =>
        currentList.map(item => {
          if (item.date === dateStr && item.time === time) {
            return { ...item, level: nuevoNivel, name: nuevoNombre };
          }
          return item;
        })
      );

      // Ocultar modal de selección y mostrar el diálogo de éxito
      this.showClassTypeModal = false;
      this.showSuccessModal = true;
      this.cdr.detectChanges();

    } catch (error: any) {
      console.error('Error al actualizar el nivel de la clase:', error);
      alert('Hubo un error al actualizar el tipo de clase.');
    }
  }

  scrollWeekDays(direction: number) {
    const maxOffset = this.weekDaysGrid.length - 5;
    this.weekScrollOffset += direction * 2;
    if (this.weekScrollOffset < 0) this.weekScrollOffset = 0;
    if (this.weekScrollOffset > maxOffset) this.weekScrollOffset = maxOffset;
  }

  get visibleWeekDays() {
    return this.weekDaysGrid.slice(this.weekScrollOffset, this.weekScrollOffset + 5);
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
    this.cdr.detectChanges();
       console.log('loadCoaches');
    await this.loadCoaches();
      console.log('loadMonthSchedules');
    await this.loadMonthSchedules();
    this.isLoading = false;
    this.cdr.detectChanges();
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


async loadMonthSchedules() {
   console.log('loadMonthSchedules');
  const year = this.selectedDate.getFullYear();
  const month = (this.selectedDate.getMonth() + 1).toString().padStart(2, '0');
  const yearMonthKey = `${year}-${month}`; // 👈 CORREGIDO: Se calcula del mes seleccionado en pantalla, no de batchTargetDate

  this.isLoading = true;
  this.cdr.detectChanges();

  try {
    // 1. Consultar el metadato remoto de última actualización
    console.log('getRemoteUltimaActualizacion');
    const remoteTimestamp = await this.cacheService.getRemoteUltimaActualizacion(this.idBranch, yearMonthKey);

    // 2. Revisar si tenemos datos locales en IndexedDB
     console.log('getLocalMonth');
    const localData = await this.cacheService.getLocalMonth(yearMonthKey);

    // 3. Validar si la caché local es válida (si el timestamp remoto es menor o igual al local)
       console.log(`comparacion ${localData?.ultimaActualizacion} (${remoteTimestamp}) `);

    if (localData && localData.ultimaActualizacion >= remoteTimestamp) {
      // 🌟 Recorrer y asegurar que todas tengan colorHex
  const clasesValidadas = localData.classes.map(clase => {
    const tieneColor = !!clase.colorHex;
   // console.log(`Clase ${clase.time} (${clase.date}) - ¿Tiene color?: ${tieneColor ? clase.colorHex : 'NO (asignando default)'}`);

    return {
      ...clase,
      colorHex: clase.colorHex || '#71717a' // Color de respaldo si viniera vacío
    };
  });
      // ¡Caché válida! Cargamos desde IndexedDB sin gastar lecturas masivas en Firestore
      this.monthClasses.set(localData.classes);

      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    // 4. Si no hay caché o el servidor tiene una versión más reciente, descargamos de Firestore
    const db = getFirestore();
    const diasRef = collection(db, `classes/studios/${this.idBranch}/${yearMonthKey}/dias`);
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
          colorHex: data['color'],
          level: data['level'] || 0,
          cancelada: data['cancelada'] || false
        });
      });
    }

    // Actualizamos la señal en memoria
    this.monthClasses.set(loadedClasses);

    // Guardamos la nueva copia en IndexedDB junto con el timestamp actual o remoto
    await this.cacheService.saveLocalMonth(yearMonthKey, remoteTimestamp, loadedClasses);

  } catch (error) {
    console.error('Error al sincronizar horarios con caché:', error);
  } finally {
    this.isLoading = false;
    this.cdr.detectChanges();
  }
}
  openBatchModal(dateStr: string) {
    this.batchTargetDate = dateStr;
    this.selectedBatchSlots.set([]);
    if (this.coachesList.length > 0) {
      this.selectedCoachForBatch = this.coachesList[0];
    }
    this.showBatchModal = true;
  }

  getSlotCoach(hora: string): TeacherResponse | undefined {
    const found = this.selectedBatchSlots().find(s => s.horario === hora);
    return found ? found.coach : undefined;
  }

toggleBatchHour(hora: string) {
    if (!this.selectedCoachForBatch) return;

    const fechaActual = this.batchTargetDate;
    const currentSlots = this.selectedBatchSlots();

    // Verificamos si ya estaba en la base de datos
    const claseEnBD = this.monthClasses().find(c => c.date === fechaActual && c.time === hora);

    // Verificamos si ya está en nuestra lista temporal de lote actual
    const indexEnLote = currentSlots.findIndex(s => s.horario === hora);

    if (claseEnBD) {
      if (claseEnBD.coach === this.selectedCoachForBatch.name) {
        // El usuario hizo clic con EL MISMO maestro propietario -> Quiere DESELECCIONARLA / QUITARLA
        if (indexEnLote > -1) {
          this.selectedBatchSlots.set(currentSlots.filter(s => s.horario !== hora));
        } else {
          this.selectedBatchSlots.set([...currentSlots, { horario: hora, coach: null as any, isDelete: true }]);
        }
      } else {
        alert(`Este horario ya está asignado al maestro: "${claseEnBD.coach}". Debes seleccionar a ese maestro para poder liberarlo.`);
      }
    } else {
      if (indexEnLote > -1) {
        this.selectedBatchSlots.set(currentSlots.filter(s => s.horario !== hora));
      } else {
        this.selectedBatchSlots.set([...currentSlots, { horario: hora, coach: this.selectedCoachForBatch, isDelete: false }]);
      }
    }
  }

  // 2. Estado visual para saber si está pintado
  getSlotVisualState(hora: string): { color: string, coachName: string, isAssigned: boolean } {
    const fechaActual = this.batchTargetDate;

    const slotEnLote = this.selectedBatchSlots().find(s => s.horario === hora);
    if (slotEnLote) {
      if (slotEnLote.isDelete) {
        // Si el usuario acaba de deseleccionar la que estaba en BD
        return { color: '#f4f4f5', coachName: '', isAssigned: false };
      }
      return { color: slotEnLote.coach.colorHex, coachName: slotEnLote.coach.name, isAssigned: true };
    }

    const claseEnBD = this.monthClasses().find(c => c.date === fechaActual && c.time === hora);
    if (claseEnBD) {
      return { color: claseEnBD.colorHex || '#71717a', coachName: claseEnBD.coach, isAssigned: true };
    }

    return { color: '#f4f4f5', coachName: '', isAssigned: false };
  }

  // 3. Conteo dinámico real para el botón inferior
  get totalActiveBatchSlotsCount(): number {
    const fechaActual = this.batchTargetDate;
    // Todas las de la BD para este día
    const clasesBD = this.monthClasses().filter(c => c.date === fechaActual);
    let horariosActivosSet = new Set(clasesBD.map(c => c.time));

    // Aplicar modificaciones del lote actual
    this.selectedBatchSlots().forEach(slot => {
      if (slot.isDelete) {
        horariosActivosSet.delete(slot.horario);
      } else {
        horariosActivosSet.add(slot.horario);
      }
    });

    return horariosActivosSet.size;
  }


  // 3. Abrir el modal de tipo de clase asegurando la captura correcta desde cualquier vista (Mes, Semana, Día)
  openClassTypeModal(dateStr: string, time: string) {
    this.selectedScheduleTarget = { dateStr, time };
    this.selectedClassTypeItem = null;
    this.showClassTypeModal = true;
  }

async saveBatchSchedule() {
    const sucursal = this.authService.getSucursal();
    const fechaActual = this.batchTargetDate;

    // 1. Obtenemos todas las clases que ya existían en la BD para este día
    const clasesExistentesBD = this.monthClasses().filter(c => c.date === fechaActual);

    // Creamos un mapa o listado base con lo que hay actualmente en la BD
    // Estructura temporal: Map<hora, coachName>
    const mapaHorariosActivos = new Map<string, { coachName: string, idCoach: string, color: string, photo: string }>();

    clasesExistentesBD.forEach(c => {
      // Buscamos los datos completos del coach en la lista general
      const coachObj = this.coachesList.find(tc => tc.name === c.coach);
      mapaHorariosActivos.set(c.time, {
        coachName: c.coach,
        idCoach: coachObj?.id || coachObj?.idDocumentFirebase || '',
        color: c.colorHex || '#71717a',
        photo: coachObj?.photoUrl || ''
      });
    });

    // 2. Aplicamos las modificaciones que hizo el usuario en la sesión actual de este lote (selectedBatchSlots)
    this.selectedBatchSlots().forEach(slot => {
      if (slot.isDelete) {
        // Si el usuario lo deseleccionó, lo borramos del mapa final
        mapaHorariosActivos.delete(slot.horario);
      } else if (slot.coach) {
        // Si el usuario lo seleccionó o cambió de maestro, lo agregamos/actualizamos
        mapaHorariosActivos.set(slot.horario, {
          coachName: slot.coach.name,
          idCoach: slot.coach.id || slot.coach.idDocumentFirebase,
          color: slot.coach.colorHex,
          photo: slot.coach.photoUrl || ''
        });
      }
    });

    // 3. Convertimos el mapa final consolidado al formato que exige tu API (horariosArray)
    const horariosArray: InfoClassItem[] = [];
    mapaHorariosActivos.forEach((val, hora) => {
      horariosArray.push({
        horario: hora,
        infoClase: {
          id: 0,
          coach: val.coachName,
          idCoach: val.idCoach,
          name: 'Por definir',
          time: hora,
          duration: 50,
          level: 1,
          aggended: 0,
          total: sucursal?.branchInfo?.myBikes?.length || 0,
          photo: val.photo,
          color: val.color
        }
      });
    });

    if (horariosArray.length === 0) {
      alert('No hay horarios seleccionados para guardar.');
      return;
    }

    const payload = {
      idSucursal: this.idBranch,
      dia: this.batchTargetDate,
      horarios: horariosArray // <--- ¡Aquí ya viajarán llenos con todos los horarios activos!
    };

    const apiUrl = 'https://registerstudioschedules-rdotx3vmaq-uc.a.run.app';
    this.http.post(apiUrl, payload).subscribe({
      next: async () => {
        // Actualización local inmediata en la señal
        const nuevasClasesFinales: ClassSchedule[] = horariosArray.map(item => ({
          time: item.horario,
          coach: item.infoClase.coach,
          name: item.infoClase.name,
          date: this.batchTargetDate,
          colorHex: item.infoClase.color,
          level: item.infoClase.level
        }));

        this.monthClasses.update(currentList => {
          const filtrados = currentList.filter(item => item.date !== this.batchTargetDate);
          return [...filtrados, ...nuevasClasesFinales];
        });

        this.showBatchModal = false;
        this.selectedBatchSlots.set([]); // Limpiamos la selección temporal

        // Persistir en IndexedDB
        try {
          const yearMonthKey = this.batchTargetDate.substring(0, 7);
          await this.cacheService.saveLocalMonth(yearMonthKey, Date.now(), this.monthClasses());
        } catch (e) {
          console.error('Error al guardar en caché local:', e);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al guardar horarios en lote:', err);
        alert('Error al registrar los horarios.');
      }
    });
  }
  async saveIndividualSchedule() {
    const sucursal = this.authService.getSucursal();
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
        total: sucursal.branchInfo.myBikes.length,
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
      next: async () => {
        // 🌟 Actualización local inmediata para la clase individual
        const nuevaClase: ClassSchedule = {
          time: this.individualTargetHour,
          coach: this.selectedCoachForIndividual!.name,
          name: 'Por definir',
          date: this.individualTargetDate,
          colorHex: this.selectedCoachForIndividual!.colorHex,
          level: 1
        };

        this.monthClasses.update(currentList => {
          const filtrados = currentList.filter(item =>
            !(item.date === this.individualTargetDate && item.time === this.individualTargetHour)
          );
          return [...filtrados, nuevaClase];
        });

        this.showIndividualModal = false;

        // 🌟 Persistir de inmediato en IndexedDB la caché local actualizada
        try {
          const yearMonthKey = this.individualTargetDate.substring(0, 7);
          await this.cacheService.saveLocalMonth(yearMonthKey, Date.now(), this.monthClasses());
        } catch (e) {
          console.error('Error al guardar en caché local:', e);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al guardar clase individual:', err);
        alert('Error al registrar la clase.');
      }
    });
  }
  openIndividualModal(dateStr: string, hour: string) {
    this.individualTargetDate = dateStr;
    this.individualTargetHour = hour;
    if (this.coachesList.length > 0) {
      this.selectedCoachForIndividual = this.coachesList[0];
    }
    this.showIndividualModal = true;
  }


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

      week.push({
        name: nextDay.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
        dateStr,
        items: unifiedItems
      });
    }
    return week;
  }

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

  formatDateHeader(): string {
    return this.selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
