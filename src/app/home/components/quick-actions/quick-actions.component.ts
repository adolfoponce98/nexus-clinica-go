import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Activity, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './quick-actions.component.html'
})
export class QuickActionsComponent {
  readonly Activity = Activity;
  readonly ChevronRight = ChevronRight;

  actions = input.required<Array<{ title: string; icon: any; colorClass: string }>>();
  actionClicked = output<string>();
}
