import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';
import { ClinicalDocumentViewComponent } from './clinical-document-view.component';

export interface PdfBlock {
  start: number;
  end: number;
}
// Prefer section/row boundaries; oversized blocks may continue on the following page.
export function clinicalPageSlices(height: number, pageHeight: number, blocks: PdfBlock[]) {
  const pages: { start: number; height: number }[] = [];
  let start = 0;
  while (start < height) {
    let end = Math.min(height, Math.floor(start + pageHeight));
    if (end < height) {
      let previous: number;
      do {
        previous = end;
        const crossing = blocks.filter(
          (b) =>
            b.start > start + 2 &&
            b.start < end - 1 &&
            b.end > end + 1 &&
            b.end - b.start < pageHeight,
        );
        if (crossing.length)
          end = Math.max(start + 1, Math.floor(Math.min(...crossing.map((b) => b.start))));
      } while (end < previous);
    }
    pages.push({ start, height: Math.max(1, end - start) });
    start = end;
  }
  // Canvas padding and fractional edges must not create a nearly empty last sheet.
  if (pages.length > 1 && pages[pages.length - 1].height <= pageHeight * 0.03) {
    const tail = pages.pop()!;
    pages[pages.length - 1].height += tail.height;
  }
  return pages;
}

@Injectable({ providedIn: 'root' })
export class ClinicalNotePdfService {
  private environmentInjector = inject(EnvironmentInjector);
  private application = inject(ApplicationRef);

  async generate(note: any, options: { draft: boolean; integrityHash?: string }): Promise<File> {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:-12000px;top:0;width:1000px;padding:16px;background:#fff;color:#172033;--bg-primary:#f8fafc;--bg-secondary:#fff;--text-main:#172033;--text-muted:#64748b;--border-color:#e2e8f0;font-family:Roboto,Arial,sans-serif;pointer-events:none';
    document.body.appendChild(host);
    const component = createComponent(ClinicalDocumentViewComponent, {
      environmentInjector: this.environmentInjector,
      hostElement: host,
    });
    this.application.attachView(component.hostView);
    try {
      component.setInput('note', note);
      component.setInput('integrityHash', options.integrityHash || '');
      component.changeDetectorRef.detectChanges();
      await document.fonts.ready;
      await Promise.all(
        Array.from(host.querySelectorAll('img')).map(async (image) => {
          try {
            await image.decode();
          } catch {
            throw new Error(
              'No se pudo cargar una firma del documento. Intenta descargar el PDF nuevamente.',
            );
          }
        }),
      );
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(host, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 1400,
      } as any);
      const pdf = new jsPDF({ format: 'letter', unit: 'mm', compress: true });
      const width = pdf.internal.pageSize.getWidth() - 20;
      const availableHeight = pdf.internal.pageSize.getHeight() - 28;
      const origin = host.getBoundingClientRect();
      const scale = canvas.width / origin.width;
      const blocks: PdfBlock[] = Array.from(
        host.querySelectorAll(
          '.document-masthead,.document-dates,.identity-grid,.reading-section,.reading-grid > div,.vitals-reading > div,.diagnosis-reading,.medication-reading,.signature-reading,.integrity-reading,h3,img',
        ),
      ).map((element) => {
        const box = element.getBoundingClientRect();
        return { start: (box.top - origin.top) * scale, end: (box.bottom - origin.top) * scale };
      });
      // Keep individual text lines intact when a narrative exceeds a full page.
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const box of Array.from(range.getClientRects()))
          blocks.push({
            start: (box.top - origin.top) * scale,
            end: (box.bottom - origin.top) * scale,
          });
      }
      const pages = clinicalPageSlices(
        canvas.height,
        (availableHeight * canvas.width) / width,
        blocks,
      );
      const folio = note.numeroDeConsulta || note.followUpId || 'documento-clinico';
      for (const [index, slice] of pages.entries()) {
        if (index) pdf.addPage();
        const segment = document.createElement('canvas');
        segment.width = canvas.width;
        segment.height = slice.height;
        const context = segment.getContext('2d');
        if (!context) throw new Error('No se pudo generar el PDF.');
        context.drawImage(
          canvas,
          0,
          slice.start,
          canvas.width,
          slice.height,
          0,
          0,
          canvas.width,
          slice.height,
        );
        const fittedWidth = Math.min(width, (availableHeight * canvas.width) / slice.height);
        pdf.addImage(
          segment.toDataURL('image/png'),
          'PNG',
          10,
          10,
          fittedWidth,
          (slice.height * fittedWidth) / canvas.width,
          undefined,
          'FAST',
        );
        pdf.setFontSize(8);
        pdf.setTextColor(100);
        pdf.text(
          `${options.draft ? 'BORRADOR - ' : ''}${folio} - ${index + 1}/${pages.length}`,
          10,
          pdf.internal.pageSize.getHeight() - 9,
        );
      }
      return new File(
        [pdf.output('blob')],
        String(folio).replace(/[^a-zA-Z0-9_-]/g, '_') + (options.draft ? '-BORRADOR' : '') + '.pdf',
        { type: 'application/pdf' },
      );
    } finally {
      this.application.detachView(component.hostView);
      component.destroy();
      host.remove();
    }
  }
}
