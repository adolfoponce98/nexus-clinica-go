import { Component, Input, OnChanges, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { clinicalDate } from './followup-utils';
import { LmsRow, lmsZ, lmsValue, percentile, interpolateLms } from './growth-reference';
const tables = new Map<string, Promise<LmsRow[]>>();
@Component({
  selector: 'app-pediatric-growth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pediatric-growth.component.html',
  styleUrls: ['./followup-ui.css', './specialty-widgets.css'],
})
export class PediatricGrowthComponent implements OnChanges, OnDestroy {
  @Input() birthDate = '';
  @Input() at = '';
  @Input() vitals: any = {};
  @Input() data: any = {};
  charts = signal<any[]>([]);
  message = signal('');
  private sequence = 0;
  ngOnChanges() {
    void this.calculate();
  }
  ngOnDestroy() {
    this.sequence++;
  }
  private table(key: string) {
    if (!tables.has(key)) {
      const p = fetch('/assets/clinical/who/' + key + '.json')
        .then(async (r) => {
          if (!r.ok) throw new Error('No se pudieron cargar las tablas OMS.');
          return (await r.json()) as LmsRow[];
        })
        .catch((e) => {
          tables.delete(key);
          throw e;
        });
      tables.set(key, p);
    }
    return tables.get(key)!;
  }
  async calculate() {
    const seq = ++this.sequence;
    this.message.set('');
    const born = new Date(this.birthDate + 'T12:00:00Z'),
      at = this.at ? new Date(this.at) : new Date(),
      day = Math.floor(
        (new Date(clinicalDate(at) + 'T12:00:00Z').getTime() - born.getTime()) / 86400000,
      ),
      sex =
        this.data.growthReferenceSex === 'Femenino'
          ? 'girls'
          : this.data.growthReferenceSex === 'Masculino'
            ? 'boys'
            : '';
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(this.birthDate) ||
      !Number.isFinite(day) ||
      born.toISOString().slice(0, 10) !== this.birthDate ||
      day < 0 ||
      day / 30.4375 > 228 ||
      !sex
    ) {
      this.charts.set([]);
      this.message.set(
        'Se necesita fecha de nacimiento válida y sexo de referencia. Referencias OMS: talla e IMC hasta 19 años; peso hasta 10 años.',
      );
      return;
    }
    const older = day > 1856,
      age = older ? day / 30.4375 : day,
      position = this.data.measurementPosition;
    let height = Number(this.vitals.heightCm);
    if (height > 0 && position) {
      if (day < 731 && position === 'De pie') height += 0.7;
      else if (day >= 731 && position === 'Acostado') height -= 0.7;
    }
    const input: any = {
      weight: Number(this.vitals.weight),
      height: position ? height : 0,
      bmi:
        position && height > 0 && Number(this.vitals.weight) > 0
          ? Number(this.vitals.weight) / (height / 100) ** 2
          : 0,
    };
    const results: any[] = [];
    try {
      for (const metric of ['weight', 'height', 'bmi']) {
        if (this.data.bilateralEdema === true && metric !== 'height') {
          results.push({
            metric,
            label: metric === 'weight' ? 'Peso / edad' : 'IMC / edad',
            unavailable: 'No se calcula con edema bilateral en pies.',
          });
          continue;
        }
        if (older && metric === 'weight' && age > 120) {
          results.push({
            metric,
            label: 'Peso / edad',
            unavailable: 'La OMS no publica peso/edad después de los 10 años.',
          });
          continue;
        }
        const rows = await this.table(metric + '-' + sex + (older ? '-older' : '')),
          row = interpolateLms(rows, age),
          value = input[metric];
        if (!row || !(value > 0)) {
          results.push({
            metric,
            label:
              metric === 'weight'
                ? 'Peso / edad'
                : metric === 'height'
                  ? 'Talla / edad'
                  : 'IMC / edad',
            unavailable:
              metric !== 'weight' && !position
                ? 'Selecciona la posición de medición de talla/longitud.'
                : 'Completa la medición correspondiente.',
          });
          continue;
        }
        const z = lmsZ(row, value),
          p = percentile(z),
          range = older ? 24 : 180,
          low = Math.max(rows[0][0], age - range),
          high = Math.min(rows[rows.length - 1][0], age + range),
          sample = rows.filter((r, i) => r[0] >= low && r[0] <= high && i % (older ? 1 : 7) === 0);
        if (!sample.length) sample.push(row);
        const minimum = Math.min(...sample.map((r) => lmsValue(r, -2)), value) * 0.93,
          maximum = Math.max(...sample.map((r) => lmsValue(r, 2)), value) * 1.07,
          x = (a: number) => 35 + ((a - low) / Math.max(1, high - low)) * 440,
          y = (v: number) => 170 - ((v - minimum) / Math.max(0.01, maximum - minimum)) * 140;
        const curves = [-2, 0, 2].map((n) => ({
          z: n,
          color: n === 0 ? '#34b399' : '#8aa4c6',
          points: sample.map((r) => x(r[0]) + ',' + y(lmsValue(r, n))).join(' '),
        }));
        results.push({
          metric,
          label:
            metric === 'weight'
              ? 'Peso / edad'
              : metric === 'height'
                ? 'Talla / edad'
                : 'IMC / edad',
          z,
          p,
          curves,
          x: x(age),
          y: y(value),
          lower: older ? (low / 12).toFixed(1) + ' años' : Math.round(low / 30.4375) + ' meses',
          upper: older ? (high / 12).toFixed(1) + ' años' : Math.round(high / 30.4375) + ' meses',
          outside: Math.abs(z) > 3,
        });
      }
      if (seq === this.sequence) this.charts.set(results);
    } catch (e: any) {
      if (seq === this.sequence) this.message.set(e.message);
    }
  }
}
