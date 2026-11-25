import { Component } from '@angular/core';
import { PrescriptionBrandingComponent } from './prescription-branding.component';
@Component({ selector: 'app-prescription-branding', standalone: true, template: '' })
class BrandingStub {}
import { TestBed } from '@angular/core/testing';
import { ClinicalIdentityComponent } from './clinical-identity.component';
import { ClinicApiService } from '../reporting/clinic-api.service';
import { PermissionService } from '../auth/permission.service';
import { API_URLS } from '../config/api-urls';
const profile = {
  fullName: 'Doctora de prueba',
  professionalLicense: '12345678',
  profession: 'Médica cirujana',
  educationalInstitution: 'Universidad de prueba',
  specialty: 'Medicina general',
  signatureImage: 'data:image/png;base64,SIGNATURE_TEST',
  signatureAcknowledged: true,
};
function setup(edit = true, signature = profile.signatureImage) {
  const api = {
    post: vi.fn().mockResolvedValue({ profile: { ...profile, signatureImage: signature } }),
  };
  TestBed.configureTestingModule({
    imports: [ClinicalIdentityComponent],
    providers: [
      { provide: ClinicApiService, useValue: api },
      { provide: PermissionService, useValue: { can: () => edit } },
    ],
  });
  TestBed.overrideComponent(ClinicalIdentityComponent, {
    remove: { imports: [PrescriptionBrandingComponent] },
    add: { imports: [BrandingStub] },
  });
  const fixture = TestBed.createComponent(ClinicalIdentityComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, api };
}
describe('Clinical identity and existing signature', () => {
  it('loads a saved signature as a preview without showing an empty signature pad', async () => {
    const { fixture, c } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(c.signatureIsSaved).toBe(true);
    expect(fixture.nativeElement.querySelector('.signature-preview img').getAttribute('src')).toBe(
      profile.signatureImage,
    );
    expect(fixture.nativeElement.querySelector('app-signature-pad')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Cerrar sesión por inactividad');
    expect(fixture.nativeElement.querySelector('.ai-button').disabled).toBe(true);
  });
  it('offers file upload when there is no saved signature', async () => {
    const { fixture } = setup(true, '');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.signature-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.signature-preview')).toBeNull();
    expect(fixture.nativeElement.querySelector('.save-identity').disabled).toBe(true);
  });
  it('saves identity and the existing image through the authenticated service', async () => {
    const { fixture, c, api } = setup();
    await fixture.whenStable();
    c.profile.fullName = 'Nombre actualizado';
    const saved = vi.fn();
    c.identitySaved.subscribe(saved);
    await c.save();
    expect(api.post.mock.calls[1]).toEqual([
      API_URLS.SAVE_CLINICAL_IDENTITY,
      expect.objectContaining({
        fullName: 'Nombre actualizado',
        signatureImage: profile.signatureImage,
      }),
    ]);
    expect(saved).toHaveBeenCalledTimes(1);
  });
  it('rejects an unsupported file without replacing the stored signature', async () => {
    const { fixture, c, api } = setup();
    await fixture.whenStable();
    const input = {
      files: [new File(['<svg/>'], 'signature.svg', { type: 'image/svg+xml' })],
      value: 'file',
    };
    await c.upload({ target: input } as any);
    expect(c.error()).toContain('PNG, JPG o WebP');
    expect(c.profile.signatureImage).toBe(profile.signatureImage);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('does not let a read-only user upload or save an identity', async () => {
    const { fixture, c, api } = setup(false);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#clinical-full-name').disabled).toBe(true);
    await c.save();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('reuses the signature UI and the existing profile-save request in signature-only presentation', async () => {
    const { fixture, c, api } = setup();
    await fixture.whenStable();
    fixture.componentRef.setInput('mode', 'signature');
    fixture.componentRef.setInput('showHeading', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#clinical-full-name')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-prescription-branding')).toBeNull();
    expect(fixture.nativeElement.querySelector('.signature-preview img')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.save-identity').textContent).toContain(
      'Guardar firma',
    );
    await c.save();
    expect(api.post.mock.calls.at(-1)).toEqual([
      API_URLS.SAVE_CLINICAL_IDENTITY,
      expect.objectContaining({
        signatureImage: profile.signatureImage,
        professionalLicense: profile.professionalLicense,
        signatureAcknowledged: true,
      }),
    ]);
  });
});
