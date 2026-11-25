import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClinicalAssetDialogComponent } from './clinical-asset-dialog.component';
describe('Identity asset dialog operations', () => {
  it('keeps the dialog open while the shared editor is saving or processing an image', () => {
    const close = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { kind: 'signature' } },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const c = TestBed.runInInjectionContext(() => new ClinicalAssetDialogComponent());
    const busy = signal(true);
    c.signature = { busy, imageBusy: signal(false) } as any;
    c.close();
    expect(close).not.toHaveBeenCalled();
    busy.set(false);
    c.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
