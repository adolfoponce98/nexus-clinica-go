import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessionIdleService } from './session-idle.service';
import { AuthService } from './auth.service';
import { ClinicApiService } from '../reporting/clinic-api.service';

describe('Batched user activity', () => {
  let service: SessionIdleService,
    post: ReturnType<typeof vi.fn>,
    logout: ReturnType<typeof vi.fn>,
    navigate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T18:00:00Z'));
    localStorage.clear();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    post = vi.fn().mockResolvedValue({ timeoutMinutes: 60 });
    logout = vi.fn().mockResolvedValue(undefined);
    navigate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getSession: () => ({ sessionId: 'same-session' }), logout },
        },
        { provide: ClinicApiService, useValue: { post } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    service = TestBed.inject(SessionIdleService);
  });
  afterEach(() => {
    service.stop();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  const interact = () => window.dispatchEvent(new Event('pointerdown'));
  it('reports continuous interaction at most every ten minutes, sharing the limit with another tab', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    const other = TestBed.runInInjectionContext(() => new SessionIdleService());
    other.start();
    try {
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(60_000);
        interact();
        await vi.advanceTimersByTimeAsync(0);
      }
      expect(post).toHaveBeenCalledTimes(2);
      expect(post.mock.calls[0][1].timeoutMinutes).toBe(60);
    } finally {
      other.stop();
    }
  });
  it('does not send empty heartbeats and logs out after sixty minutes without interaction', async () => {
    service.start();
    await vi.advanceTimersByTimeAsync(59 * 60_000);
    expect(post).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'inactivity' } });
  });
  it('does not reset the inactivity clock when reloading or interacting with an expired session', async () => {
    localStorage.setItem(
      'cliniq-last-user-activity',
      JSON.stringify({ sessionId: 'same-session', at: Date.now() - 61 * 60_000 }),
    );
    service.start();
    interact();
    await vi.advanceTimersByTimeAsync(0);
    expect(logout).toHaveBeenCalledTimes(1);
    expect(post).not.toHaveBeenCalled();
  });
  it('retries a failed activity report after one minute, without retrying on each event', async () => {
    post.mockRejectedValueOnce(new Error('offline'));
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
      interact();
    }
    expect(post).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('does not report in hidden tabs or count focus as user activity', async () => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    service.start();
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    window.dispatchEvent(new Event('focus'));
    expect(post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(50 * 60_000);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
