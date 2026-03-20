const { TENANT_FEATURE_PAGES, TENANT_FEATURE_KEYS } = require('./tenantFeatures');

describe('tenant feature catalog', () => {
  it('includes the newer centre record pages in the admin feature list', () => {
    const expectedKeys = [
      'pwd_info',
      'umcs',
      'stickers',
      'performas',
      'candidates',
      'dispatch_slip',
      'remuneration',
    ];

    expectedKeys.forEach((key) => {
      expect(TENANT_FEATURE_KEYS).toContain(key);
    });

    const pagesByKey = new Map(TENANT_FEATURE_PAGES.map((page) => [page.key, page]));

    expect(pagesByKey.get('pwd_info')).toMatchObject({
      label: 'PwD Info',
      path: '/pwd-info',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('umcs')).toMatchObject({
      label: "UMC's",
      path: '/umcs',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('stickers')).toMatchObject({
      label: 'Stickers',
      path: '/stickers',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('performas')).toMatchObject({
      label: "Performa's",
      path: '/performas',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('candidates')).toMatchObject({
      label: 'Candidate Details',
      path: '/candidate-details',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('dispatch_slip')).toMatchObject({
      label: 'Dispatch Slip',
      path: '/dispatch-slip',
      group: 'Centre Records',
    });
    expect(pagesByKey.get('remuneration')).toMatchObject({
      label: 'Remuneration',
      path: '/remuneration',
      group: 'Centre Records',
    });
  });
});
