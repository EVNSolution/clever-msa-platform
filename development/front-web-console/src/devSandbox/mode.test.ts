import { describe, expect, it } from 'vitest';

import { isLocalSandboxMode } from './mode';

describe('isLocalSandboxMode', () => {
  it('returns false for dev and local-test', () => {
    expect(isLocalSandboxMode('development')).toBe(false);
    expect(isLocalSandboxMode('local-test')).toBe(false);
  });

  it('returns true only for local-sandbox', () => {
    expect(isLocalSandboxMode('local-sandbox')).toBe(true);
  });
});
