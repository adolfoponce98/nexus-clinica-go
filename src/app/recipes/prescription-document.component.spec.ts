import { TestBed } from '@angular/core/testing';
import { PrescriptionDocumentComponent } from './prescription-document.component';
import { PRESCRIPTION_TEMPLATES, examplePrescription } from './prescription-templates';
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,TEST' } }));
describe('Doctor and office logos on prescription documents', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    ),
  );
  afterEach(() => vi.unstubAllGlobals());
  it('keeps the doctor identity and respects per-template clinic logos and watermarks in both orientations', () => {
    const f = TestBed.createComponent(PrescriptionDocumentComponent);
    for (const orientation of ['portrait', 'landscape'])
      for (const t of PRESCRIPTION_TEMPLATES) {
        f.componentRef.setInput(
          'prescription',
          examplePrescription(
            { fullName: 'Dra. Prueba', logoUrl: 'https://example.test/doctor.png' },
            { name: 'Clínica', logoUrl: 'https://example.test/office.png' },
            t.id,
            orientation,
          ),
        );
        f.detectChanges();
        const doc = f.nativeElement as HTMLElement;
        expect(
          doc.querySelector('.rx-prescriber .rx-doctor-logo img')?.getAttribute('src'),
        ).toContain('doctor.png');
        expect(doc.querySelector('.rx-prescriber h1')?.textContent).toBe('Dra. Prueba');
        expect(!!doc.querySelector('.rx-brand .rx-office-logo')).toBe(t.officeLogo);
        expect(!!doc.querySelector('.rx-watermark img')).toBe(t.watermark);
        if (t.watermark)
          expect(doc.querySelector('.rx-watermark img')?.getAttribute('src')).toContain(
            t.officeLogo ? 'office.png' : 'doctor.png',
          );
      }
  });
  it('uses the doctor logo for the watermark and keeps the doctor header when there is no office logo', () => {
    const f = TestBed.createComponent(PrescriptionDocumentComponent);
    f.componentRef.setInput(
      'prescription',
      examplePrescription(
        { fullName: 'Dra. Prueba', logoUrl: 'https://example.test/doctor.png' },
        { name: 'Clínica' },
        'emerald',
      ),
    );
    f.detectChanges();
    expect(f.nativeElement.querySelector('.rx-office-logo')).toBeNull();
    expect(f.nativeElement.querySelector('.rx-doctor-logo img')).not.toBeNull();
    expect(f.nativeElement.querySelector('.rx-watermark img').getAttribute('src')).toContain(
      'doctor.png',
    );
  });
  it('does not replace the doctor logo with the office logo and handles a failed image independently', () => {
    const f = TestBed.createComponent(PrescriptionDocumentComponent);
    f.componentRef.setInput(
      'prescription',
      examplePrescription(
        { fullName: 'Dra. Prueba', logoUrl: 'https://example.test/doctor.png' },
        { logoUrl: 'https://example.test/office.png' },
        'ocean',
      ),
    );
    f.detectChanges();
    f.nativeElement.querySelector('.rx-office-logo').dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(f.nativeElement.querySelector('.rx-office-logo')).toBeNull();
    expect(f.nativeElement.querySelector('.rx-doctor-logo img')).not.toBeNull();
    expect(f.nativeElement.querySelector('.rx-watermark img')).not.toBeNull();
  });
  it('has exactly three templates with a clinic logo and exactly two without a watermark', () => {
    expect(PRESCRIPTION_TEMPLATES.filter((t) => t.officeLogo).map((t) => t.id)).toEqual([
      'ocean',
      'indigo',
      'botanical',
    ]);
    expect(PRESCRIPTION_TEMPLATES.filter((t) => !t.watermark).map((t) => t.id)).toEqual([
      'editorial',
      'graphite',
    ]);
  });
});
