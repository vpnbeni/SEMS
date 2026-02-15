const {
  resolveModuleFromPath,
  isReadOnlyBlockedPath,
  shouldSkipForPath,
} = require('../billingEntitlement');

describe('billingEntitlement helpers', () => {
  it('maps known route prefixes to modules', () => {
    expect(resolveModuleFromPath('/dashboard/todays-exams')).toBe('dashboard');
    expect(resolveModuleFromPath('/seating-plan/generate/main-gate/123')).toBe('seating_plan');
    expect(resolveModuleFromPath('/form66/records')).toBe('form66');
    expect(resolveModuleFromPath('/unknown-path')).toBe('unknown-path');
  });

  it('identifies read-only blocked expensive paths', () => {
    expect(isReadOnlyBlockedPath('/seating-plan/generate/main-gate/abc')).toBe(true);
    expect(isReadOnlyBlockedPath('/form66/dates/12.03.2026/pdf')).toBe(true);
    expect(isReadOnlyBlockedPath('/export/teachers')).toBe(true);
    expect(isReadOnlyBlockedPath('/dashboard/todays-exams')).toBe(false);
  });

  it('skips auth and billing paths from enforcement', () => {
    expect(shouldSkipForPath('/auth/login')).toBe(true);
    expect(shouldSkipForPath('/billing/me')).toBe(true);
    expect(shouldSkipForPath('/subjects')).toBe(false);
  });
});
