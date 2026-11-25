import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  LucideAngularModule,
  Building2,
  BookOpen,
  ClipboardList,
  Target,
  Sparkles,
  Share2,
  KeyRound,
  Undo2,
  Archive,
  ShieldCheck,
  Mail,
  MapPin,
  Printer,
} from 'lucide-angular';
import { PRIVACY_NOTICE_SECTIONS, PRIVACY_NOTICE_VERSION } from './privacy-notice.content';
@Component({
  selector: 'app-privacy-notice',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './privacy-notice.component.html',
  styleUrl: './privacy-notice.component.css',
})
export class PrivacyNoticeComponent implements OnInit, OnDestroy {
  private title = inject(Title);
  private previousTitle = this.title.getTitle();
  readonly version = PRIVACY_NOTICE_VERSION;
  readonly sections = PRIVACY_NOTICE_SECTIONS;
  readonly icons: Record<string, typeof ShieldCheck> = {
    Building2,
    BookOpen,
    ClipboardList,
    Target,
    Sparkles,
    Share2,
    KeyRound,
    Undo2,
    Archive,
    ShieldCheck,
    Mail,
    MapPin,
    Printer,
  };
  ngOnInit() {
    this.title.setTitle('Aviso de privacidad · Clínica Go');
  }
  ngOnDestroy() {
    this.title.setTitle(this.previousTitle);
  }
  print() {
    window.print();
  }
}
