import { BillingService } from '../planes/billing.service';
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from './clinic-api.service';
import { API_URLS } from '../config/api-urls';
import { localDateKey } from '../appointment-history/appointment-history.utils';
import {
  REPORT_COLUMNS,
  REPORT_TITLES,
  reportValue,
  exportExcel,
  exportPdf,
} from './report-export';

@Component({
  selector: 'app-clinic-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit, OnDestroy {
  readonly billing = inject(BillingService);
  readonly auth = inject(AuthService);
  private readonly api = inject(ClinicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly subs = new Subscription();
  private generation = 0;
  private destroyed = false;
  readonly type = signal('patients');
  readonly data = signal<any>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly preparing = signal(false);
  readonly error = signal('');
  readonly progress = signal('');
  readonly page = signal(1);
  readonly title = computed(() => REPORT_TITLES[this.type()]);
  readonly columns = computed(() => REPORT_COLUMNS[this.type()]);
  readonly incomplete = computed(() => this.data()?.coverage?.some((c: any) => !c.complete));
  readonly rows = computed(() => this.data()?.rows || []);
  readonly pages = computed(() => Math.max(1, Math.ceil(this.rows().length / 50)));
  readonly visible = computed(() => this.rows().slice((this.page() - 1) * 50, this.page() * 50));
  readonly missingMonths = computed(() =>
    [
      ...new Set(
        (this.data()?.coverage || []).filter((c: any) => !c.complete).map((c: any) => c.month),
      ),
    ].join(', '),
  );
  readonly value = reportValue;
  readonly titles = REPORT_TITLES;
  officePeriod = 'month';
  startMonth = localDateKey().slice(0, 7);
  endMonth = this.startMonth;
  selected: string[] = [];
  offices: any[] = [];
  ngOnInit(): void {
    this.resetOffices();
    this.subs.add(
      this.route.paramMap.subscribe((params) => {
        const type = params.get('type') || 'patients';
        this.type.set(REPORT_COLUMNS[type] ? type : 'patients');
        this.invalidate();
      }),
    );
    this.subs.add(
      this.auth.branchChanged$.subscribe(() => {
        this.resetOffices();
        this.invalidate();
      }),
    );
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation++;
    this.subs.unsubscribe();
  }
  private resetOffices(): void {
    this.offices = this.auth
      .getAllBranches()
      .map((o) => ({ id: o.idConsultorio || o.id, name: o.name }))
      .filter((o) => o.id);
    const active = this.auth.getSucursal(),
      id = this.api.branchId();
    if (id && !this.offices.some((o) => o.id === id))
      this.offices.push({ id, name: active?.name || id });
    this.selected = id ? [id] : [];
  }
  invalidate(): void {
    this.generation++;
    this.data.set(null);
    this.page.set(1);
    this.error.set('');
  }
  toggle(id: string, checked: boolean): void {
    this.selected = checked
      ? [...new Set([...this.selected, id])]
      : this.selected.filter((o) => o !== id);
    this.invalidate();
  }
  selectAll(): void {
    this.selected = this.offices.map((o) => o.id);
    this.invalidate();
  }
  async load(): Promise<void> {
    await this.billing.refresh();
    if (!this.billing.allows('reports')) {
      this.error.set('Los reportes están disponibles con una suscripción activa.');
      return;
    }
    if (!this.selected.length) {
      this.error.set('Selecciona al menos un consultorio.');
      return;
    }
    const generation = ++this.generation;
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.api.post(API_URLS.GET_METRICS_REPORT, {
        type: this.type(),
        startMonth: this.startMonth,
        endMonth: this.endMonth,
        idsConsultorios: this.selected,
        officePeriod: this.officePeriod,
      });
      if (generation === this.generation) {
        this.data.set(data);
        this.page.set(1);
      }
    } catch (e: any) {
      if (generation === this.generation) this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }
  async export(format: 'pdf' | 'xlsx'): Promise<void> {
    const data = this.data();
    if (!this.billing.allows('reports') || !data || this.exporting()) return;
    this.exporting.set(true);
    this.error.set('');
    try {
      await (format === 'pdf' ? exportPdf(data) : exportExcel(data));
    } catch {
      this.error.set('No se pudo generar el archivo.');
    } finally {
      this.exporting.set(false);
    }
  }
  async prepare(): Promise<void> {
    if (!this.billing.allows('reports') || this.preparing()) return;
    if (this.selected.length !== 1 || this.startMonth !== this.endMonth) {
      this.error.set('Para preparar históricos, selecciona un consultorio y un solo mes.');
      return;
    }
    const branch = this.selected[0],
      month = this.startMonth;
    this.preparing.set(true);
    this.error.set('');
    let after: string | null = null,
      processed = 0;
    try {
      do {
        const result = await this.api.post(API_URLS.REBUILD_METRICS, {
          idConsultorio: branch,
          month,
          after,
        });
        processed += result.processed;
        this.progress.set(
          result.phase === 'patients'
            ? 'Preparando datos generales de pacientes…'
            : `Preparando históricos: ${processed} / ${result.total}`,
        );
        if (after && result.next === after) throw new Error('No se pudo avanzar la preparación');
        after = result.next;
      } while (after && !this.destroyed);
      if (!this.destroyed) await this.load();
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.preparing.set(false);
      this.progress.set('');
    }
  }
}
