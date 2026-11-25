describe('Prescription QR rendering', () => {
  let QrComponent: typeof import('./prescription-qr.component').PrescriptionQrComponent;
  let demoPayload: string;
  const toDataURL = vi.fn();
  beforeEach(async () => {
    // The component is also imported by other suites through shared chunks.
    // Load it after installing this test's encoder rather than observing a second module instance.
    vi.resetModules();
    toDataURL.mockReset().mockResolvedValue('data:image/png;base64,QR_TEST');
    vi.doMock('qrcode', () => ({ default: { toDataURL }, toDataURL }));
    const module = await import('./prescription-qr.component');
    QrComponent = module.PrescriptionQrComponent;
    demoPayload = module.DEMO_PRESCRIPTION_QR;
  });
  afterEach(() => vi.doUnmock('qrcode'));
  it('uses an explicitly fictional payload only in template previews', async () => {
    const c = new QrComponent();
    c.example = true;
    c.payload = 'REAL_ENCRYPTED_VALUE';
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledWith(demoPayload, expect.objectContaining({ margin: 4, errorCorrectionLevel: 'M' }));
    expect(c.image()).toContain('data:image/png');
  });
  it('renders the server ciphertext without client-side patient identifiers or keys', async () => {
    const c = new QrComponent();
    c.payload = 'CG-RX1:server-encrypted-identifiers';
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledWith(c.payload, expect.anything());
    await c.ngOnChanges();
    expect(toDataURL).toHaveBeenCalledTimes(1);
  });
  it('does not fabricate a QR for an unlinked legacy prescription', async () => {
    const c = new QrComponent();
    await c.ngOnChanges();
    expect(toDataURL).not.toHaveBeenCalled();
    expect(c.image()).toBe('');
  });
});
