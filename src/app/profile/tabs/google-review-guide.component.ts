import { Component, ElementRef, Input, ViewChild, signal } from '@angular/core';
import {
  LucideAngularModule,
  MapPin,
  Link2,
  CheckCircle2,
  CircleAlert,
  X,
  ExternalLink,
} from 'lucide-angular';
@Component({
  selector: 'app-google-review-guide',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './google-review-guide.component.html',
  styleUrl: './google-review-guide.component.css',
})
export class GoogleReviewGuideComponent {
  @Input() officeName = 'Tu consultorio';
  @ViewChild('guideDialog') dialog!: ElementRef<HTMLDialogElement>;
  readonly mode = signal<'reviews' | 'maps'>('reviews');
  readonly icons = { MapPin, Link2, CheckCircle2, CircleAlert, X, ExternalLink };
  open() {
    this.mode.set('reviews');
    this.dialog.nativeElement.showModal();
  }
}
