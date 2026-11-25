import { TestBed } from '@angular/core/testing';
import { FaithfulPrescriptionDocumentComponent } from './faithful-prescription-document.component';
const style = { font: 'Arial', fontSize: 11, color: '#164e63', align: 'left' };
const design = {
  version: 2,
  pageWidth: 660,
  pageHeight: 900,
  paperColor: '#ffffff',
  elements: [
    {
      type: 'text',
      x: 10,
      y: 5,
      width: 80,
      height: 5,
      text: 'DRA. ELENA ROBLES · Cédula 1234567',
      ...style,
    },
    { type: 'text', x: 5, y: 95, width: 90, height: 3, text: 'Contacto impreso al pie', ...style },
  ],
  fields: [
    { key: 'patientName', x: 10, y: 25, width: 80, height: 4, ...style },
    { key: 'medications', x: 5, y: 40, width: 90, height: 30, ...style },
    { key: 'signature', x: 60, y: 80, width: 30, height: 7, ...style },
    { key: 'qr', x: 5, y: 80, width: 12, height: 10, ...style },
  ],
};
describe('Faithful physical prescription renderer', () => {
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
  it('keeps printed information instead of replacing it with the profile and renders contact at the original footer', () => {
    const f = TestBed.createComponent(FaithfulPrescriptionDocumentComponent);
    f.componentRef.setInput('prescription', {
      example: true,
      customTemplate: { design },
      header: {
        author: { fullName: 'Otro nombre en perfil' },
        patient: { fullName: 'Paciente de ejemplo' },
      },
      medications: [],
    });
    f.detectChanges();
    const host = f.nativeElement as HTMLElement;
    expect(host.textContent).toContain('DRA. ELENA ROBLES');
    expect(host.textContent).not.toContain('Otro nombre en perfil');
    expect((host.querySelectorAll('.original-element')[1] as HTMLElement).style.top).toBe('855px');
    expect(host.querySelector('[data-slot="patientName"]')?.textContent).toContain(
      'Paciente de ejemplo',
    );
  });
  it('moves the footer down when prescription content needs more room without altering the header', () => {
    const f = TestBed.createComponent(FaithfulPrescriptionDocumentComponent);
    f.componentRef.setInput('prescription', {
      customTemplate: { design },
      header: {},
      medications: [],
    });
    f.detectChanges();
    f.componentInstance.overflow.set(200);
    expect(f.componentInstance.top(design.elements[0])).toBe(45);
    expect(f.componentInstance.top(design.elements[1])).toBe(1055);
  });
});
