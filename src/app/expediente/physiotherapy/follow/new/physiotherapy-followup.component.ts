import { Component } from '@angular/core';
import { FollowupWorkspaceComponent } from '../../../shared-followup/followup-workspace.component';
import { SpecialtyFieldsComponent } from '../../../shared-followup/specialty-fields.component';
@Component({
  selector: 'app-physiotherapy-followup',
  standalone: true,
  imports: [FollowupWorkspaceComponent, SpecialtyFieldsComponent],
  templateUrl: './physiotherapy-followup.component.html',
})
export class PhysiotherapyFollowupComponent {}
