import { PrescriptionQrComponent, DEMO_PRESCRIPTION_QR } from './prescription-qr.component';
import { toDataURL } from 'qrcode';
vi.mock('qrcode', () => {
  const toDataURL = vi.fn().mockResolvedValue('data:image/png;base64,QR_TEST');
  return { default: { toDataURL }, toDataURL };
});
describe('Prescription QR rendering', () => {
  beforeEach(() => vi.clearAllMocks());
  it('uses an explicitly fictional payload only in template previews', async () => {
    const c = new PrescriptionQrComponent();
    c.example = true;
    c.payload = 'REAL_ENCRYPTED_VALUE';
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledWith(
      DEMO_PRESCRIPTION_QR,
      expect.objectContaining({ margin: 4, errorCorrectionLevel: 'M' }),
    );
    expect(c.image()).toContain('data:image/png');
  });
  it('renders the server ciphertext without client-side patient identifiers or keys', async () => {
    const c = new PrescriptionQrComponent();
    c.payload = 'CG-RX1:server-encrypted-identifiers';
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledWith(c.payload, expect.anything());
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledTimes(1);
  });
  it('does not fabricate a QR for an unlinked legacy prescription', async () => {
    const c = new PrescriptionQrComponent();
    await c.ngOnChanges();
    expect(toDataURL).not.toHaveBeenCalled();
    expect(c.image()).toBe('');
  });
});
