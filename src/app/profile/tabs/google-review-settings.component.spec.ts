import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ClinicApiService } from '../../reporting/clinic-api.service';
import { API_URLS } from '../../config/api-urls';
import { GoogleReviewSettingsComponent } from './google-review-settings.component';
function setup() {
  const branch = new Subject<void>();
  let office = 'a';
  const api = {
    branchId: () => office,
    post: vi.fn(async (url: string, payload: any) => ({
      settings:
        url === API_URLS.SAVE_GOOGLE_REVIEW_SETTINGS
          ? { ...payload, deliveryReady: false, templateStatus: 'pending' }
          : {
              enabled: false,
              reviewUrl: '',
              delayMinutes: 30,
              deliveryReady: false,
              templateStatus: 'pending',
            },
    })),
  };
  TestBed.configureTestingModule({
    imports: [GoogleReviewSettingsComponent],
    providers: [
      {
        provide: AuthService,
        useValue: {
          getSession: () => ({ email: 'doctor', typeUser: 1 }),
          getSucursal: () => ({ name: office }),
          branchChanged$: branch,
        },
      },
      { provide: ClinicApiService, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(GoogleReviewSettingsComponent);
  fixture.detectChanges();
  return {
    fixture,
    c: fixture.componentInstance,
    api,
    branch,
    setOffice: (id: string) => (office = id),
  };
}
describe('Google review invitation settings', () => {
  it('loads per office and saves the switch preference without claiming messages are being sent', async () => {
    const { fixture, c, api } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('[role=switch]') as HTMLInputElement;
    toggle.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.post).toHaveBeenCalledWith(API_URLS.SAVE_GOOGLE_REVIEW_SETTINGS, {
      idConsultorio: 'a',
      enabled: true,
      reviewUrl: '',
      delayMinutes: 30,
    });
    expect(c.enabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Plantilla de WhatsApp pendiente');
    expect(c.notice()).toContain('pendiente');
  });
  it('shows a loader while saving and rolls back the preference when persistence fails', async () => {
    const { fixture, c, api } = setup();
    await fixture.whenStable();
    let reject!: (error: Error) => void;
    api.post.mockImplementationOnce(() => new Promise((_resolve, fail) => (reject = fail)));
    c.enabled = true;
    const pending = c.save();
    expect(c.saving()).toBe(true);
    reject(new Error('No se pudo guardar'));
    await pending;
    expect(c.enabled).toBe(false);
    expect(c.saving()).toBe(false);
    expect(c.error()).toBe('No se pudo guardar');
  });
  it('clears the previous office preference when switching offices', async () => {
    const { fixture, c, setOffice, branch, api } = setup();
    await fixture.whenStable();
    c.enabled = true;
    await c.save();
    setOffice('b');
    branch.next();
    await fixture.whenStable();
    expect(c.enabled).toBe(false);
    expect(c.notice()).toBe('');
    expect(api.post).toHaveBeenLastCalledWith(API_URLS.GET_GOOGLE_REVIEW_SETTINGS, {
      idConsultorio: 'b',
    });
  });
  it('shows the generated office-specific public review link after saving', async () => {
    const { c, fixture, api } = setup();
    await fixture.whenStable();
    api.post.mockResolvedValueOnce({
      settings: {
        enabled: true,
        reviewUrl: 'https://g.page/r/example/review',
        delayMinutes: 30,
        reviewLink: 'https://clinica-go.com/resenas/' + 'a'.repeat(43),
      },
    } as any);
    await c.save();
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '#office-review-public-link',
    ) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('https://clinica-go.com/resenas/' + 'a'.repeat(43));
  });
});
