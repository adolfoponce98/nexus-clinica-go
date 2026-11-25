import { Component } from '@angular/core';
import { FollowupWorkspaceComponent } from '../shared-followup/followup-workspace.component';
@Component({
  selector: 'app-medical-followup-detail-container',
  standalone: true,
  imports: [FollowupWorkspaceComponent],
  templateUrl: './medical-followup-detail-container.component.html',
})
export class MedicalFollowupDetailContainerComponent {}
