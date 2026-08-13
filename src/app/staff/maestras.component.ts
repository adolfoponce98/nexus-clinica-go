import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAngularModule,
  UserRoundPen,
  Star,
  Plus,
  CheckCircle2
} from 'lucide-angular';
import { MaestrasService } from './maestras.service';
import { TeacherResponse } from './maestra.model'; // Asegúrate de importar tu interfaz

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [MaestrasService],
  templateUrl: './maestras.component.html'
})
export class StaffComponent implements OnInit {
  readonly UserRoundPen = UserRoundPen;
  readonly Star = Star;
  readonly Plus = Plus;
  readonly CheckCircle2 = CheckCircle2;
  isLoading = true;
  // Usa string | null porque los IDs de Firebase/TeacherResponse son string
  selectedStaffId = signal<string | null>(null);

  // Tipa explícitamente la señal con TeacherResponse[]
  instructors = signal<TeacherResponse[]>([]);

  idBranch: string = 'BEAST-TESISTAN';

  constructor(private maestrasService: MaestrasService) {}

  ngOnInit(): void {
    this.obtenerMaestras();
  }

  obtenerMaestras() {
    const request = { branchId: this.idBranch };

    this.maestrasService.obtenerMaestras(request).subscribe({
      next: (response) => {
        if (response.success && response.teachers) {
          this.isLoading =false
          this.instructors.set(response.teachers);
          if (response.teachers.length > 0) {
            this.selectedStaffId.set(response.teachers[0].id || null);
          }
        }
      },
      error: (err) => {
        console.error('Error al obtener las maestras:', err);
      }
    });
  }

  // Ahora TypeScript sabrá que esto retorna un TeacherResponse | undefined
  selectedStaff = computed(() =>
    this.instructors().find(i => i.id === this.selectedStaffId())
  );

  selectStaff(id?: string) {
    if (id) {
      this.selectedStaffId.set(id);
    }
  }
}
