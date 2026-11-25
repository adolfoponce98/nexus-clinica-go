import { Component, Input } from '@angular/core';
import {
  LucideAngularModule,
  MapPin,
  Phone,
  Clock,
  Accessibility,
  Building2,
  FileText,
  Utensils,
  KeyRound,
} from 'lucide-angular';
import { normalizeOfficeHours } from '../scheduling/office-hours';
@Component({
  selector: 'app-office-card-details',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './office-card-details.component.html',
  styleUrl: './office-card-details.component.css',
})
export class OfficeCardDetailsComponent {
  @Input({ required: true }) office: any;
  readonly icons = { MapPin, Phone, Clock, Accessibility, Building2, FileText, Utensils, KeyRound };
  text(value: any) {
    return typeof value === 'string' && value.trim() && value.trim() !== '-'
      ? value.trim()
      : typeof value === 'number'
        ? String(value)
        : '';
  }
  get identity() {
    return this.rows([
      ['Tipo de establecimiento', this.office.establishmentType],
      ['CLUES', this.office.clues],
      ['Descripción', this.office.description],
    ]);
  }
  get address() {
    return this.rows([
      ['Calle y número', this.office.address],
      ['Colonia', this.office.colony || this.office.neighborhood],
      ['Ciudad / municipio', this.office.city || this.office.municipality],
      ['Estado', this.office.state],
      ['País', this.office.country],
      ['Código postal', this.office.postalCode],
      ['Piso, torre o interior', this.office.additionalInfo],
    ]);
  }
  get fullAddress() {
    const parts = this.address.map((row) =>
      row.label === 'Código postal' ? 'C.P. ' + row.value : row.value,
    );
    return parts
      .reduce((all: string[], part: string) => {
        const existing = all.flatMap((v) => v.split(',')).map((v) => v.trim().toLocaleLowerCase());
        if (!existing.includes(part.toLocaleLowerCase())) all.push(part);
        return all;
      }, [])
      .join(', ');
  }
  get contact() {
    return this.rows([
      ['Teléfono principal', this.office.phoneMain || this.office.phone || this.office.telefono],
      ['Teléfono secundario', this.office.phoneSecondary],
      ['Correo electrónico', this.office.email || this.office.correo],
      ['Sitio web', this.office.website],
    ]);
  }
  private rows(values: any[][]) {
    return values
      .map(([label, value]) => ({ label, value: this.text(value) }))
      .filter((v) => v.value);
  }
  get accessibility() {
    return [
      ['wheelchair', 'Silla de ruedas o muletas'],
      ['pregnantOrKids', 'Personas embarazadas o con niños'],
      ['visualDisability', 'Discapacidad visual'],
      ['hearingDisability', 'Discapacidad auditiva'],
    ].map(([key, label]) => ({
      label,
      value:
        this.office.accessibility?.[key] === true
          ? 'Disponible'
          : this.office.accessibility?.[key] === false
            ? 'No disponible'
            : 'No especificado',
      enabled: this.office.accessibility?.[key] === true,
    }));
  }
  get services() {
    const rows =
      Array.isArray(this.office.services) && this.office.services.length
        ? this.office.services
        : Array.isArray(this.office.servicesInOffice)
          ? this.office.servicesInOffice
          : [];
    return rows
      .map((s: any) => ({
        name: this.text(s.nombre || s.name),
        price: s.costo ?? s.precio ?? s.cost ?? s.price,
      }))
      .filter((s: any) => s.name);
  }
  price(value: any) {
    return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value))
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))
      : '';
  }
  get schedule() {
    try {
      const h = normalizeOfficeHours(this.office.officeHours),
        order = [1, 2, 3, 4, 5, 6, 0],
        labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const groups: any[] = [];
      for (const id of order) {
        const day = h.days.find((d: any) => d.day === id),
          key = JSON.stringify([day.closed, day.periods]);
        let group = groups.find((g) => g.key === key);
        if (!group) {
          const pauses = day.periods
            .slice(1)
            .flatMap((p: any, i: number) =>
              day.periods[i].end === p.start ? [] : [day.periods[i].end + '–' + p.start],
            );
          group = {
            key,
            days: [],
            closed: day.closed,
            hours: day.closed
              ? 'Cerrado'
              : day.periods.map((p: any) => p.start + '–' + p.end).join(' / '),
            pauses: pauses.join(' / '),
          };
          groups.push(group);
        }
        group.days.push(labels[id]);
      }
      return {
        groups,
        default: !this.office.officeHours,
        zone: h.timeZone === 'America/Mexico_City' ? 'Hora de Ciudad de México' : h.timeZone,
        error: false,
      };
    } catch {
      return { groups: [], default: false, zone: '', error: true };
    }
  }
}
