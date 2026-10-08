import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule, Search, Filter, Plus, ChevronDown, ChevronUp,
  FileText, Activity, Camera, AlertCircle, Clock, Phone, Users, UserCheck,
  CheckCircle2, ArrowLeft, ArrowRight, Calendar, DollarSign, Heart, Mail, MapPin,
  ShieldAlert, Pill,MessageSquare, Utensils, Moon, CreditCard, Image as ImageIcon
} from 'lucide-angular';

export interface Alumno {
  id: string;
  name: string;
  photo: string;
  grupo: string;
  categoria: 'Lactantes' | 'Maternal' | 'Preescolar';
  estatus: 'PRESENTE' | 'AUSENTE' | 'RECOGIDO';
  edad: string;
  fechaNac: string;
  curp: string;
  genero: string;
  ingreso: string;
  direccion: string;
  alergias?: string[];
  medicamentoPendiente?: string;
  alertaMedica?: string;
  asistenciaMensual: string;
  estatusPago: string;
  ultimoPago: string;
  incidentesMes: number;
  docsPorVencer: number;
  tipoSangre: string;
  medicoResponsable: string;
  tutores: { nombre: string; parentesco: string; rol: string; telefono: string; foto: string }[];
  autorizados: { nombre: string; parentesco: string; telefono: string; foto: string }[];
  expanded: boolean;
}

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './alumnos.component.html'
})
export class AlumnosComponent {
  readonly icons = {
    Search, Filter, Plus, ChevronDown, ChevronUp,
    FileText, Activity, Camera, AlertCircle, Clock, Phone, Users, UserCheck,
    CheckCircle2, ArrowLeft, ArrowRight, Calendar, DollarSign, Heart, Mail, MapPin,
    ShieldAlert, Pill, Utensils, Moon, CreditCard, ImageIcon ,MessageSquare
  };

  searchTerm = signal('');
  selectedCategory = signal<string>('Todos');

  // Control de vista: null = lista de alumnos, Alumno = pantalla de detalle completa
  selectedAlumnoForDetail = signal<Alumno | null>(null);

  // Pestañas internas dentro de la pantalla de detalle del alumno
  activeDetailTab = signal<'perfil' | 'alimentacion' | 'pagos' | 'documentos'>('perfil');

  // Listado completo de alumnos con información robusta
  alumnosList = signal<Alumno[]>([
    {
      id: '1',
      name: 'Mateo García López',
      photo: 'https://ui-avatars.com/api/?name=Mateo+Garcia&background=1e1b4b&color=93c5fd',
      grupo: 'Kinder 2A',
      categoria: 'Preescolar',
      estatus: 'PRESENTE',
      edad: '4 años 8 meses',
      fechaNac: '15 de Mayo, 2019',
      curp: 'GALM190515HDFRXX09',
      genero: 'Masculino',
      ingreso: 'Agosto 2022',
      direccion: 'Av. Siempre Viva 123, Col. Centro',
      alergias: ['Nueces', 'Penicilina'],
      alertaMedica: 'Alergia severa a las nueces y penicilina. Epipen en enfermería.',
      medicamentoPendiente: 'Multivitamínico (Diario 8:00 AM)',
      asistenciaMensual: '95%',
      estatusPago: 'Al día',
      ultimoPago: '01/Nov',
      incidentesMes: 2,
      docsPorVencer: 1,
      tipoSangre: 'O Positivo (O+)',
      medicoResponsable: 'Dr. Roberto Sánchez',
      tutores: [
        { nombre: 'Ana López', parentesco: 'Madre', rol: 'Tutor Principal', telefono: '+34 600 111 222', foto: 'https://ui-avatars.com/api/?name=Ana+Lopez&background=1e1b4b&color=93c5fd' },
        { nombre: 'Carlos García', parentesco: 'Padre', rol: 'Tutor Secundario', telefono: '+34 600 333 444', foto: 'https://ui-avatars.com/api/?name=Carlos+Garcia&background=1e1b4b&color=93c5fd' }
      ],
      autorizados: [
        { nombre: 'Rosa Martínez', parentesco: 'Abuela Materna', telefono: '+34 600 555 666', foto: 'https://ui-avatars.com/api/?name=Rosa+Martinez&background=1e1b4b&color=93c5fd' },
        { nombre: 'Luis López', parentesco: 'Tío', telefono: '+34 600 777 888', foto: 'https://ui-avatars.com/api/?name=Luis+Lopez&background=1e1b4b&color=93c5fd' }
      ],
      expanded: false
    },
    {
      id: '2',
      name: 'Ana Sofía López',
      photo: 'https://ui-avatars.com/api/?name=Ana+Sofia+Lopez&background=1e1b4b&color=93c5fd',
      grupo: 'Maternal B',
      categoria: 'Maternal',
      estatus: 'PRESENTE',
      edad: '2 años 3 meses',
      fechaNac: '10 de Enero, 2021',
      curp: 'LOSA210110MDFRXX01',
      genero: 'Femenino',
      ingreso: 'Enero 2023',
      direccion: 'Calle Luna 45, Col. Jardines',
      alergias: ['Maní y Nueces'],
      medicamentoPendiente: 'Paracetamol 12:00 PM',
      alertaMedica: 'Alergia al maní y frutos secos.',
      asistenciaMensual: '92%',
      estatusPago: 'Al día',
      ultimoPago: '28/Oct',
      incidentesMes: 0,
      docsPorVencer: 0,
      tipoSangre: 'A Positivo (A+)',
      medicoResponsable: 'Dra. Carmen Morales',
      tutores: [
        { nombre: 'María López', parentesco: 'Madre', rol: 'Tutor Principal', telefono: '+34 611 222 333', foto: 'https://ui-avatars.com/api/?name=Maria+Lopez&background=1e1b4b&color=93c5fd' }
      ],
      autorizados: [
        { nombre: 'Ana Gómez', parentesco: 'Abuela', telefono: '+34 611 444 555', foto: 'https://ui-avatars.com/api/?name=Ana+Gomez&background=1e1b4b&color=93c5fd' }
      ],
      expanded: false
    }
  ]);

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  toggleExpand(alumnoId: string) {
    this.alumnosList.update(list =>
      list.map(a => a.id === alumnoId ? { ...a, expanded: !a.expanded } : a)
    );
  }

  verDetalleAlumno(alumno: Alumno) {
    this.selectedAlumnoForDetail.set(alumno);
    this.activeDetailTab.set('perfil');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  regresarALista() {
    this.selectedAlumnoForDetail.set(null);
  }

  setActiveDetailTab(tab: 'perfil' | 'alimentacion' | 'pagos' | 'documentos') {
    this.activeDetailTab.set(tab);
  }

  get filteredAlumnos() {
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();

    return this.alumnosList().filter(alumno => {
      const matchesCategory = cat === 'Todos' || alumno.categoria === cat;
      const matchesSearch = alumno.name.toLowerCase().includes(term) ||
                            alumno.grupo.toLowerCase().includes(term) ||
                            alumno.tutores.some(t => t.nombre.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }

  triggerAction(actionName: string, targetName: string) {
    alert(`Acción "${actionName}" ejecutada para ${targetName}`);
  }
}
