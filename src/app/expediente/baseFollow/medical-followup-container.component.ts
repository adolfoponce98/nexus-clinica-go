import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service'; // Ajusta la ruta según tu estructura de carpetas
import { MedicalFollowupComponent } from '../traumatologic/follow/new/medical-followup.component'; // Tu componente existente de Traumatología
import { OdontologyFollowupComponent } from '../dentist/follow/new/odontology-followup.component'; // El componente de Odontología que creamos

@Component({
  selector: 'app-medical-followup-container',
  standalone: true,
  imports: [
    CommonModule,
    MedicalFollowupComponent,
    OdontologyFollowupComponent
  ],
  templateUrl: './medical-followup-container.component.html'
})
export class MedicalFollowupContainerComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  currentSpecialtyCode: string = 'GEN'; // Valor por defecto
  patientId: string = '';

  ngOnInit(): void {
    // 1. Opcional: Puedes capturar el ID del paciente si lo necesitas a nivel general o pasarlo por @Input
    this.route.paramMap.subscribe(params => {
      this.patientId = params.get('id') || '';
    });

    // 2. Obtenemos los datos de la sesión para identificar la especialidad del médico logueado
    const sessionData = this.authService.getSession();

    if (sessionData) {
      // Extraemos el código de especialidad (puedes adaptarlo según cómo guardes tu sesión)
      this.currentSpecialtyCode = sessionData?.especialidades?.[0] || sessionData?.especialidad || 'GEN';

      // Normalizamos a mayúsculas por seguridad
      this.currentSpecialtyCode = this.currentSpecialtyCode.trim().toUpperCase();
    }
  }
}
