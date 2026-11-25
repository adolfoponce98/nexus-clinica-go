import { ElementRef } from '@angular/core';
import { SignaturePadComponent } from './signature-pad.component';
describe('Signature ink capture', () => {
  it('does not accept an empty pointer tap as a signature', () => {
    const c = new SignaturePadComponent(),
      context = { beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() },
      canvas = {
        width: 600,
        height: 180,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 180 }),
        setPointerCapture: vi.fn(),
        getContext: () => context,
        toDataURL: () => 'data:image/png;base64,ink',
      };
    c.pad = new ElementRef(canvas as any);
    const emit = vi.fn();
    c.valueChange.subscribe(emit);
    c.down({ clientX: 20, clientY: 20, pointerId: 1 } as PointerEvent);
    c.up();
    expect(emit).not.toHaveBeenCalled();
    c.down({ clientX: 20, clientY: 20, pointerId: 1 } as PointerEvent);
    c.move({ clientX: 80, clientY: 40 } as PointerEvent);
    c.up();
    expect(emit).toHaveBeenCalledWith('data:image/png;base64,ink');
  });
});
