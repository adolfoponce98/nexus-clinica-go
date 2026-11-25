import { clinicalPageSlices } from './clinical-note-pdf.service';
describe('clinical PDF pagination', () => {
  it('keeps sections together and covers every pixel of the document', () => {
    const pages = clinicalPageSlices(2500, 1000, [
      { start: 900, end: 1200 },
      { start: 1800, end: 2000 },
    ]);
    expect(pages).toEqual([
      { start: 0, height: 900 },
      { start: 900, height: 900 },
      { start: 1800, height: 700 },
    ]);
    expect(pages.reduce((total, page) => total + page.height, 0)).toBe(2500);
  });
  it('does not cascade backwards across adjacent sections with fractional pixel edges', () => {
    const pages = clinicalPageSlices(2600, 1280, [
      { start: 193, end: 537.75 },
      { start: 537.75, end: 674.9375 },
      { start: 674.9375, end: 1065.375 },
      { start: 1065.375, end: 1274.75 },
      { start: 1274.75, end: 1471.9375 },
    ]);
    expect(pages[0].height).toBe(1274);
    expect(pages.length).toBe(3);
  });
  it('does not add an almost empty sheet for canvas padding at the end', () => {
    expect(clinicalPageSlices(2016, 1000, [])).toEqual([
      { start: 0, height: 1000 },
      { start: 1000, height: 1016 },
    ]);
  });
  it('splits oversized narratives at text line boundaries without blank pages', () => {
    const pages = clinicalPageSlices(2200, 1000, [
      { start: 20, end: 2190 },
      { start: 990, end: 1010 },
    ]);
    expect(pages[0].height).toBe(990);
    expect(pages.every((page) => page.height > 0 && page.height <= 1000)).toBe(true);
    expect(pages.reduce((total, page) => total + page.height, 0)).toBe(2200);
  });
});
