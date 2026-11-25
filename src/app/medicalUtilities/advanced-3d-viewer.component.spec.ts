import { TestBed } from '@angular/core/testing';
import { Advanced3DViewerComponent } from './advanced-3d-viewer.component';

describe('3D consultation captures', () => {
  it('emits a PNG file to attach without downloading it', async () => {
    const fixture = TestBed.createComponent(Advanced3DViewerComponent);
    fixture.componentRef.setInput('models', [{ id: 'body', name: 'Cuerpo', src: 'body.glb' }]);
    fixture.componentRef.setInput('selectedModelId', 'body');
    fixture.componentRef.setInput('isExpanded', true);
    fixture.componentRef.setInput('canAttach', true);
    const c = fixture.componentInstance;
    const file = new File(['capture'], 'Infografia.png', { type: 'image/png' });
    vi.spyOn(c, 'captureFile').mockResolvedValue(file);
    const emit = vi.fn();
    c.captureAttached.subscribe(emit);
    await c.takeScreenshot(true);
    expect(emit).toHaveBeenCalledWith(file);
    expect(c.capturing()).toBe(false);
  });
  it('shows an error and emits no attachment if capture fails', async () => {
    const fixture = TestBed.createComponent(Advanced3DViewerComponent);
    fixture.componentRef.setInput('canAttach', true);
    const c = fixture.componentInstance;
    vi.spyOn(c, 'captureFile').mockRejectedValue(new Error('canvas unavailable'));
    const emit = vi.fn();
    c.captureAttached.subscribe(emit);
    await c.takeScreenshot(true);
    expect(emit).not.toHaveBeenCalled();
    expect(c.captureError()).toContain('No se pudo capturar');
    expect(c.capturing()).toBe(false);
  });
});
