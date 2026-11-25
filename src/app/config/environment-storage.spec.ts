import { describe, it, expect, beforeEach } from 'vitest';
import { prepareEnvironmentStorage } from './environment-storage';
describe('environment storage boundary', () => {
  beforeEach(() => localStorage.clear());
  it('discards production clinical data and session when first opening development', () => {
    localStorage.setItem('cliniq-go-session', 'production-session');
    localStorage.setItem('cliniq-sync:v2:patients', 'production-patients');
    localStorage.setItem('other-app', 'keep');
    prepareEnvironmentStorage('clinq-go-dev');
    expect(localStorage.getItem('cliniq-go-session')).toBeNull();
    expect(localStorage.getItem('cliniq-sync:v2:patients')).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('keep');
  });
  it('preserves cache for the same project and clears when switching back', () => {
    prepareEnvironmentStorage('clinq-go-dev');
    localStorage.setItem('cliniq-go-session', 'dev-session');
    prepareEnvironmentStorage('clinq-go-dev');
    expect(localStorage.getItem('cliniq-go-session')).toBe('dev-session');
    prepareEnvironmentStorage('clinq-go');
    expect(localStorage.getItem('cliniq-go-session')).toBeNull();
  });
  it('keeps an existing production session during rollout', () => {
    localStorage.setItem('cliniq-go-session', 'production-session');
    prepareEnvironmentStorage('clinq-go');
    expect(localStorage.getItem('cliniq-go-session')).toBe('production-session');
  });
});
