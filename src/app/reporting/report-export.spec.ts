import { workbookParts, reportValue, REPORT_COLUMNS } from './report-export';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
describe('Report workbook export', () => {
  const report = {
    type: 'patients',
    startMonth: '2026-11',
    endMonth: '2026-11',
    generatedAt: '2026-11-17T12:00:00Z',
    totals: { paidCents: 12345 },
    rows: [
      {
        patientName: '=HYPERLINK("x") <Ana & Luis>',
        phone: '0000123',
        email: 'ana@example.test',
        bookings: 2,
        paidCents: 12345,
        reasons: { one: { name: 'Consulta general', bookings: 2 } },
      },
    ],
  };
  it('creates valid OOXML parts with money as numbers and user text as inline strings, never formulas', () => {
    const parts = workbookParts(report);
    for (const text of Object.values(parts))
      expect(
        new DOMParser()
          .parseFromString(text, 'application/xml')
          .getElementsByTagName('parsererror'),
      ).toHaveLength(0);
    const sheet = new DOMParser().parseFromString(
      parts['xl/worksheets/sheet1.xml'],
      'application/xml',
    );
    expect(sheet.getElementsByTagName('f')).toHaveLength(0);
    expect(sheet.querySelector('c[r="A6"]')?.getAttribute('t')).toBe('inlineStr');
    expect(sheet.querySelector('c[r="A6"]')?.textContent).toBe(report.rows[0].patientName);
    expect(sheet.querySelector('c[r="D6"]')?.textContent).toBe('0000123');
    expect(sheet.querySelector('c[r="J6"] v')?.textContent).toBe('123.45');
    expect(sheet.querySelector('autoFilter')?.getAttribute('ref')).toBe('A5:K6');
  });
  it('packages a real XLSX ZIP container and includes every exported row beyond one UI page', () => {
    const data = {
      ...report,
      rows: Array.from({ length: 121 }, (_, index) => ({
        ...report.rows[0],
        patientName: 'Paciente ' + index,
      })),
    };
    const bytes = zipSync(
      Object.fromEntries(
        Object.entries(workbookParts(data)).map(([name, text]) => [name, strToU8(text)]),
      ),
    );
    const files = unzipSync(bytes),
      sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(files['[Content_Types].xml']).toBeDefined();
    expect(sheet).toContain('Paciente 120');
    expect(sheet).toContain('A5:K126');
  });
  it('shows actual paid totals separately from charges and labels attendance correctly', () => {
    expect(
      reportValue(
        { paidCents: 5000, chargeCents: 80000 },
        REPORT_COLUMNS['patients'].find((c) => c.key === 'paidCents')!,
      ),
    ).toBe(50);
    expect(reportValue({ status: 3 }, { key: 'status', label: 'Estado' })).toBe('Asistió');
    expect(reportValue({ status: 4 }, { key: 'status', label: 'Estado' })).toBe('No asistió');
  });
});
