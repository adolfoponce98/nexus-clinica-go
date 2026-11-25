import { inject, Injectable } from '@angular/core';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { API_URLS } from '../config/api-urls';
@Injectable({ providedIn: 'root' })
export class PrescriptionPdfService {
  private api = inject(ClinicApiService);
  async generate(source: HTMLElement, folio: string): Promise<File> {
    const frame = document.createElement('div'),
      sheet = source.cloneNode(true) as HTMLElement;
    sheet.style.transform = 'none';
    frame.style.cssText =
      'position:fixed;left:-10000px;top:0;width:' +
      (source.dataset['orientation'] === 'landscape' ? 930 : 660) +
      'px;background:#fff;pointer-events:none';
    frame.appendChild(sheet);
    document.body.appendChild(frame);
    try {
      return await this.render(sheet, folio);
    } finally {
      frame.remove();
    }
  }
  private async render(sheet: HTMLElement, folio: string): Promise<File> {
    await document.fonts.ready;
    await Promise.all(
      Array.from(sheet.querySelectorAll('img')).map((img) =>
        img.decode().catch((error) => {
          if (img.closest('.rx-watermark')) {
            img.style.display = 'none';
            return;
          }
          throw error;
        }),
      ),
    );
    if (!sheet.querySelector('app-prescription-qr img'))
      throw new Error('Espera a que termine de generarse el QR antes de guardar el PDF.');
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1400,
    } as any);
    const landscape = sheet.dataset['orientation'] === 'landscape';
    const pdf = new jsPDF({
        format: 'letter',
        orientation: landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        compress: true,
      }),
      pageWidth = pdf.internal.pageSize.getWidth(),
      width = pageWidth - 24,
      height = pdf.internal.pageSize.getHeight() - 24,
      pixelHeight = (height * canvas.width) / width;
    if (canvas.height <= pixelHeight * 1.4) {
      const fittedWidth = Math.min(width, (height * canvas.width) / canvas.height);
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        (pageWidth - fittedWidth) / 2,
        12,
        fittedWidth,
        (canvas.height * fittedWidth) / canvas.width,
        undefined,
        'FAST',
      );
      return new File([pdf.output('blob')], folio.replace(/[^a-zA-Z0-9-]/g, '') + '.pdf', {
        type: 'application/pdf',
      });
    }
    const origin = sheet.getBoundingClientRect(),
      scale = canvas.width / origin.width;
    const blocks = Array.from(
      sheet.querySelectorAll(
        '.rx-header,.rx-office,.rx-folio,.rx-patient,.rx-medicine,.rx-extra,.rx-legal,.rx-footer',
      ),
    )
      .map((el) => {
        const b = el.getBoundingClientRect();
        return { start: (b.top - origin.top) * scale, end: (b.bottom - origin.top) * scale };
      })
      .sort((a, b) => a.start - b.start);
    let start = 0,
      page = 0;
    while (start < canvas.height) {
      let end = Math.min(start + pixelHeight, canvas.height);
      const crossing = blocks.find(
        (b) =>
          b.start > start + 10 && b.start < end && b.end > end && b.end - b.start < pixelHeight,
      );
      if (crossing) end = crossing.start;
      const segment = document.createElement('canvas');
      segment.width = canvas.width;
      segment.height = Math.max(1, Math.floor(end - start));
      segment
        .getContext('2d')!
        .drawImage(
          canvas,
          0,
          start,
          canvas.width,
          segment.height,
          0,
          0,
          canvas.width,
          segment.height,
        );
      if (page++) pdf.addPage();
      pdf.setFontSize(7);
      pdf.setTextColor(100);
      pdf.text(folio + ' · Página ' + page, 12, 7);
      pdf.addImage(
        segment.toDataURL('image/png'),
        'PNG',
        12,
        12,
        width,
        (segment.height * width) / canvas.width,
        undefined,
        'FAST',
      );
      start += segment.height;
    }
    return new File([pdf.output('blob')], folio.replace(/[^a-zA-Z0-9-]/g, '') + '.pdf', {
      type: 'application/pdf',
    });
  }
  async upload(
    file: File,
    patientId: string,
    expedienteId: string,
    officeId: string,
    followUpId?: string,
  ) {
    if (this.api.branchId() !== officeId)
      throw new Error('El consultorio cambió. Regresa al expediente para emitir la receta.');
    const signed = await this.api.post(API_URLS.GETSIGNEDUPLOADURL, {
      idConsultorio: officeId,
      objectType: 'PATIENT',
      category: 'EXPEDIENT',
      documentType: 'FILE',
      idPatient: patientId,
      idExpedient: expedienteId,
      contentType: file.type,
      originalFileName: file.name,
      ...(followUpId ? { idFollowups: followUpId } : {}),
    });
    if (!signed.uploadUrl || !(signed.readUrl || signed.publicUrl))
      throw new Error('No se obtuvo una dirección válida para adjuntar la receta.');
    const response = await fetch(signed.uploadUrl, {
      method: 'PUT',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!response.ok)
      throw new Error(
        'La receta fue emitida, pero no se pudo subir el PDF. Intenta adjuntarlo de nuevo.',
      );
    return {
      name: file.name,
      url: signed.readUrl || signed.publicUrl,
      type: 'document',
      uploading: false,
      progress: 100,
    };
  }
  download(file: File) {
    const url = URL.createObjectURL(file),
      a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
