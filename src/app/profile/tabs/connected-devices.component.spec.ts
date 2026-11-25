import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConnectedDevicesComponent } from './connected-devices.component';
import { OfficeSyncService } from '../../auth/office-sync.service';
import { AuthService } from '../../auth/auth.service';
import { browserDevice } from '../../auth/browser-device';
import { API_URLS } from '../../config/api-urls';
describe('Connected devices settings', () => {
  it('renders metadata and confirms remote disconnection of the chosen device', async () => {
    localStorage.clear();
    const current = {
      id: browserDevice().id,
      name: 'Chrome en Windows',
      os: 'Windows',
      pushEnabled: true,
      lastSeen: Date.now(),
    };
    const remote = {
      id: 'remote-device-0000001',
      name: 'Safari en macOS',
      os: 'macOS',
      pushEnabled: false,
      lastSeen: Date.now(),
    };
    const call = vi
      .fn()
      .mockResolvedValueOnce({ devices: [current, remote] })
      .mockResolvedValueOnce({ currentDevice: false })
      .mockResolvedValueOnce({ devices: [current] });
    TestBed.configureTestingModule({
      imports: [ConnectedDevicesComponent],
      providers: [
        { provide: OfficeSyncService, useValue: { call, updates: new Subject<string>() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    TestBed.inject(AuthService).saveSession({
      email: 'doctor@example.test',
      sessionToken: 'access',
    });
    const fixture = TestBed.createComponent(ConnectedDevicesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 dispositivos activos');
    expect(fixture.nativeElement.textContent).toContain('Safari en macOS');
    fixture.nativeElement.querySelectorAll('article button')[1].click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Safari en macOS');
    expect(call).toHaveBeenCalledTimes(1);
    dialog.querySelectorAll('button')[1].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(call).toHaveBeenCalledWith(API_URLS.REVOKE_CONNECTED_DEVICE, {
      deviceId: remote.id,
      idDoctor: 'doctor@example.test',
    });
    expect(fixture.nativeElement.textContent).toContain('1 dispositivos activos');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
