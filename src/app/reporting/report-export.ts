export interface ReportColumn {
  key: string;
  label: string;
  money?: boolean;
}
export function reportValue(row: any, column: ReportColumn): string | number {
  const value = row[column.key];
  if (column.key === 'reasons')
    return Object.values(value || {})
      .filter((v: any) => v.bookings > 0)
      .map((v: any) => `${v.name} (${v.bookings})`)
      .join('; ');
  if (column.key === 'status')
    return (
      ['Sin confirmar', 'Confirmada', 'Cancelada', 'Asistió', 'No asistió'][Number(value)] ||
      'Sin definir'
    );
  if (column.money) return Number(value || 0) / 100;
  return (
    value ??
    ([
      'bookings',
      'confirmedBookings',
      'cancelledBookings',
      'attendances',
      'pending',
      'confirmed',
      'cancellations',
      'noShows',
      'uniquePatients',
      'uniqueAttendedPatients',
      'unpriced',
    ].includes(column.key)
      ? 0
      : '')
  );
}
export const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  patients: [
    { key: 'patientName', label: 'Paciente' },
    { key: 'officeName', label: 'Consultorio' },
    { key: 'month', label: 'Mes' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Correo' },
    { key: 'bookings', label: 'Citas reservadas' },
    { key: 'confirmedBookings', label: 'Confirmó' },
    { key: 'cancelledBookings', label: 'Canceló' },
    { key: 'attendances', label: 'Asistencias' },
    { key: 'paidCents', label: 'Pagado (MXN)', money: true },
    { key: 'reasons', label: 'Motivos de consulta' },
  ],
  appointments: [
    { key: 'patientName', label: 'Paciente' },
    { key: 'officeName', label: 'Consultorio' },
    { key: 'date', label: 'Fecha' },
    { key: 'time', label: 'Hora' },
    { key: 'status', label: 'Estado' },
    { key: 'reason', label: 'Motivo' },
    { key: 'chargeCents', label: 'Costo (MXN)', money: true },
    { key: 'paidCents', label: 'Pagado (MXN)', money: true },
    { key: 'unpriced', label: 'Sin costo definido' },
  ],
  office: [
    { key: 'officeName', label: 'Consultorio' },
    { key: 'month', label: 'Mes / inicio de semana' },
    { key: 'bookings', label: 'Citas' },
    { key: 'uniquePatients', label: 'Pacientes únicos' },
    { key: 'uniqueAttendedPatients', label: 'Pacientes que asistieron' },
    { key: 'attendances', label: 'Asistencias' },
    { key: 'cancellations', label: 'Cancelaciones' },
    { key: 'noShows', label: 'No asistieron' },
    { key: 'paidCents', label: 'Ingresos (MXN)', money: true },
  ],
  services: [
    { key: 'serviceName', label: 'Servicio / motivo' },
    { key: 'officeName', label: 'Consultorio' },
    { key: 'month', label: 'Mes' },
    { key: 'bookings', label: 'Citas' },
    { key: 'attendances', label: 'Asistencias' },
    { key: 'cancellations', label: 'Cancelaciones' },
    { key: 'unpriced', label: 'Sin costo definido' },
    { key: 'paidCents', label: 'Ingresos (MXN)', money: true },
  ],
};
export const REPORT_TITLES: Record<string, string> = {
  patients: 'Reporte de pacientes',
  appointments: 'Reporte de citas',
  office: 'Reporte de consultorios',
  services: 'Reporte de servicios',
};
const xml = (value: unknown) =>
  String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
    );
const columnName = (index: number): string => {
  let result = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
};
export function workbookParts(report: any): Record<string, string> {
  const columns = REPORT_COLUMNS[report.type],
    last = columnName(columns.length - 1),
    title = REPORT_TITLES[report.type];
  const text = (value: unknown, address: string, style = 0) =>
    `<c r="${address}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
  const rows = [
    `<row r="1">${text(title, 'A1', 1)}</row>`,
    `<row r="2">${text(`${report.startMonth} a ${report.endMonth} · MXN`, 'A2')}</row>`,
    `<row r="3">${text(`Generado: ${report.generatedAt}`, 'A3')}</row>`,
    `<row r="4">${text('Ingreso total (MXN)', 'A4')}<c r="B4" s="2"><v>${Number(report.totals.paidCents || 0) / 100}</v></c></row>`,
    `<row r="5">${columns.map((c, i) => text(c.label, columnName(i) + '5', 1)).join('')}</row>`,
  ];
  report.rows.forEach((row: any, index: number) => {
    const r = index + 6;
    rows.push(
      `<row r="${r}">${columns
        .map((c, i) => {
          const value = reportValue(row, c),
            address = columnName(i) + r;
          return typeof value === 'number'
            ? `<c r="${address}" s="${c.money ? 2 : 0}"><v>${Number.isFinite(value) ? value : 0}</v></c>`
            : text(value, address);
        })
        .join('')}</row>`,
    );
  });
  return {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reporte" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml':
      '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${['patientName', 'reason', 'reasons', 'email', 'serviceName', 'officeName'].includes(c.key) ? 32 : 18}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData><autoFilter ref="A5:${last}${Math.max(5, report.rows.length + 5)}"/></worksheet>`,
  };
}
function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportExcel(report: any): Promise<void> {
  const { zipSync, strToU8 } = await import('fflate');
  const bytes = zipSync(
    Object.fromEntries(
      Object.entries(workbookParts(report)).map(([name, xml]) => [name, strToU8(xml)]),
    ),
  );
  download(
    new Blob([new Uint8Array(bytes)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `reporte-${report.type}-${report.startMonth}-${report.endMonth}.xlsx`,
  );
}
export async function exportPdf(report: any): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', format: 'a3' });
  const columns = REPORT_COLUMNS[report.type],
    margin = 12,
    width = pdf.internal.pageSize.getWidth() - margin * 2,
    cell = width / columns.length,
    bottom = pdf.internal.pageSize.getHeight() - 14;
  let y = 0,
    page = 0;
  const header = () => {
    page++;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text(REPORT_TITLES[report.type], margin, 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      `${report.startMonth} a ${report.endMonth} | MXN | ${report.rows.length} registros | Página ${page}`,
      margin,
      22,
    );
    pdf.text(
      `Ingresos registrados: $${(Number(report.totals.paidCents || 0) / 100).toFixed(2)} MXN`,
      margin,
      28,
    );
    pdf.text(
      'Generado: ' + new Date(report.generatedAt).toLocaleString('es-MX'),
      margin + width - 80,
      28,
    );
    pdf.setFontSize(8);
    pdf.setFillColor(37, 99, 235);
    pdf.rect(margin, 32, width, 13, 'F');
    pdf.setTextColor(255);
    columns.forEach((c, i) =>
      pdf.text(pdf.splitTextToSize(c.label, cell - 3), margin + i * cell + 1, 37),
    );
    pdf.setTextColor(20);
    y = 49;
  };
  header();
  for (let index = 0; index < report.rows.length; index++) {
    const row = report.rows[index];
    const values = columns.map((c) => {
      const v = reportValue(row, c);
      return pdf.splitTextToSize(c.money ? '$' + Number(v).toFixed(2) : String(v), cell - 3);
    });
    const lineCount = Math.max(...values.map((v) => v.length));
    let offset = 0;
    while (offset < lineCount) {
      let capacity = Math.floor((bottom - y - 6) / 3.5);
      if (capacity < 1) {
        pdf.addPage();
        header();
        capacity = Math.floor((bottom - y - 6) / 3.5);
      }
      const count = Math.min(lineCount - offset, capacity),
        height = count * 3.5 + 6;
      values.forEach((v, i) => {
        const lines = v.slice(offset, offset + count);
        if (lines.length) pdf.text(lines, margin + i * cell + 1, y + 3);
      });
      pdf.setDrawColor(210);
      pdf.line(margin, y + height, margin + width, y + height);
      y += height;
      offset += count;
      if (offset < lineCount) {
        pdf.addPage();
        header();
      }
    }
    if (index % 100 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  pdf.save(`reporte-${report.type}-${report.startMonth}-${report.endMonth}.pdf`);
}
