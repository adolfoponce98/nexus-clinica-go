import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './../auth/auth.service'; // Ajusta la ruta de tu servicio
import { MedicalRecordFormDentistComponent } from './dentist/medical-record-form-dentis.component';
import { OftalmologiaComponent } from './oftamologic/medical-record-oftamologic-form.component';
import { MedicalRecordFormComponent } from './traumatologic/medical-record-form.component';

@Component({
  selector: 'app-medical-record-container',
  standalone: true,
  imports: [
    CommonModule,
    MedicalRecordFormDentistComponent,
    MedicalRecordFormComponent,
    OftalmologiaComponent,
  ],
  templateUrl: 'medical-record-container.component.html',
})
export class MedicalRecordContainerComponent implements OnInit {
  // Inyectamos tu AuthService usando la función inject (o mediante constructor)
  private authService = inject(AuthService);

  currentSpecialtyCode: string = 'GEN'; // Valor por defecto

  ngOnInit(): void {
    // Obtenemos los datos de la sesión usando el método que ya creaste en tu servicio
    const userData = this.authService.getSession();

    if (userData) {
      // Extraemos la especialidad priorizando el array 'especialidades' o la propiedad 'especialidad'
      this.currentSpecialtyCode = userData?.especialidades?.[0] || userData?.especialidad || 'GEN';
    }
  }
}
