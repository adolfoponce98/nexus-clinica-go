import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RecetaMedicaComponent } from './receta-medica.component';
import { ClinicalAssetDialogComponent } from '../clinical/clinical-asset-dialog.component';
import { BillingService } from '../planes/billing.service';
import { ClinicApiService } from '../reporting/clinic-api.service';
describe('Nexus IA identity tools', () => {
  it('shows five cards and opens shared signature and logo editors as dialogs while keeping the list visible', () => {
    const open = vi.fn();
    TestBed.configureTestingModule({
      imports: [RecetaMedicaComponent],
      providers: [
        { provide: MatDialog, useValue: { open } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: BillingService, useValue: { allows: () => true } },
        { provide: ClinicApiService, useValue: { post: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(RecetaMedicaComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect([...host.querySelectorAll('main h3')].map((h) => h.textContent?.trim())).toEqual([
      'Receta Médica',
      'Cargar Recetario a Digitalizar',
      'Firma Digitalizada',
      'Digitalizar Logo',
      'Importar Expediente Físico',
    ]);
    const click = (title: string) =>
      (
        [...host.querySelectorAll('button')].find(
          (b) => b.querySelector('h3')?.textContent?.trim() === title,
        ) as HTMLButtonElement
      ).click();
    click('Firma Digitalizada');
    expect(open).toHaveBeenLastCalledWith(
      ClinicalAssetDialogComponent,
      expect.objectContaining({
        data: { kind: 'signature' },
        maxHeight: '92vh',
        disableClose: true,
      }),
    );
    click('Digitalizar Logo');
    expect(open).toHaveBeenLastCalledWith(
      ClinicalAssetDialogComponent,
      expect.objectContaining({ data: { kind: 'logo' }, width: '1050px' }),
    );
    expect(fixture.componentInstance.currentView()).toBe('listado');
  });
});
