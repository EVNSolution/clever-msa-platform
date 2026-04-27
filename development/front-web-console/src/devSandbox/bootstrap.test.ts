import { describe, expect, it } from 'vitest';

import { shouldEnableLocalSandbox } from './bootstrap';

describe('sandbox bootstrap gate', () => {
  it('keeps local-test on the existing remote-proxy path', async () => {
    expect(await shouldEnableLocalSandbox('local-test')).toBe(false);
  });

  it('activates only for local-sandbox', async () => {
    expect(await shouldEnableLocalSandbox('local-sandbox')).toBe(true);
  });
});
