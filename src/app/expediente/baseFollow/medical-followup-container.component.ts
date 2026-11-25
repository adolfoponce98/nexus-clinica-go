import { ClinicalPageSkeletonComponent } from '../../shared/clinical-page-skeleton.component';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { API_URLS } from '../../config/api-urls';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { resolveFollowupSpecialty } from '../shared-followup/followup-utils';
import { GeneralFollowupComponent } from '../general/follow/new/general-followup.component';
import { GynecologyFollowupComponent } from '../gynecology/follow/new/gynecology-followup.component';
import { PediatricsFollowupComponent } from '../pediatrics/follow/new/pediatrics-followup.component';
import { MedicalFollowupComponent } from '../traumatologic/follow/new/medical-followup.component';
import { DermatologyFollowupComponent } from '../dermatology/follow/new/dermatology-followup.component';
import { OdontologyFollowupComponent } from '../dentist/follow/new/odontology-followup.component';
import { NutritionFollowupComponent } from '../nutrition/follow/new/nutrition-followup.component';
import { PsychologyFollowupComponent } from '../psychology/follow/new/psychology-followup.component';
import { PhysiotherapyFollowupComponent } from '../physiotherapy/follow/new/physiotherapy-followup.component';
import { OphthalmologyFollowupComponent } from '../oftamologic/follow/new/ophthalmology-followup.component';
@Component({
  selector: 'app-medical-followup-container',
  standalone: true,
  imports: [
    ClinicalPageSkeletonComponent,
    GeneralFollowupComponent,
    GynecologyFollowupComponent,
    PediatricsFollowupComponent,
    MedicalFollowupComponent,
    DermatologyFollowupComponent,
    OdontologyFollowupComponent,
    NutritionFollowupComponent,
    PsychologyFollowupComponent,
    PhysiotherapyFollowupComponent,
    OphthalmologyFollowupComponent,
  ],
  templateUrl: './medical-followup-container.component.html',
})
export class MedicalFollowupContainerComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ClinicApiService);
  currentSpecialtyCode = 'GEN';
  loading = signal(true);
  async ngOnInit() {
    const session = this.auth.getSession();
    try {
      const result = await this.api.post(API_URLS.GET_CLINICAL_IDENTITY, {});
      this.currentSpecialtyCode = resolveFollowupSpecialty(session, result.profile);
    } catch {
      this.currentSpecialtyCode = resolveFollowupSpecialty(session);
    } finally {
      this.loading.set(false);
    }
  }
}
