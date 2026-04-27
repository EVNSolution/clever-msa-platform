import { describe, expect, it } from 'vitest';

import { resolveTenantEntry } from './resolveTenantEntry';

describe('resolveTenantEntry', () => {
  it('resolves company path entries on the apex domain', () => {
    expect(resolveTenantEntry('ev-dashboard.com', '/cheonha/login')).toEqual({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'ev-dashboard.com',
      source: 'path',
      basePath: '/cheonha',
    });
  });

  it('keeps host-based company cockpit resolution as a compatibility fallback', () => {
    expect(resolveTenantEntry('cheonha.ev-dashboard.com', '/')).toEqual({
      type: 'company',
      tenantCode: 'cheonha',
      host: 'cheonha.ev-dashboard.com',
      source: 'host',
      basePath: '',
    });
  });

  it('treats the apex domain and local hosts as the generic hub', () => {
    expect(resolveTenantEntry('ev-dashboard.com', '/')).toBeNull();
    expect(resolveTenantEntry('localhost', '/')).toBeNull();
    expect(resolveTenantEntry('127.0.0.1', '/')).toBeNull();
  });

  it('ignores reserved or foreign subdomains', () => {
    expect(resolveTenantEntry('api.ev-dashboard.com', '/')).toBeNull();
    expect(resolveTenantEntry('admin.ev-dashboard.com', '/')).toBeNull();
    expect(resolveTenantEntry('cheonha.example.com', '/')).toBeNull();
  });

  it('treats main-domain workspace routes as non-tenant paths', () => {
    expect(resolveTenantEntry('ev-dashboard.com', '/settlements/overview')).toBeNull();
    expect(resolveTenantEntry('ev-dashboard.com', '/dispatch/uploads')).toBeNull();
  });

  it('rejects malformed cockpit hosts with empty labels', () => {
    expect(resolveTenantEntry('foo..ev-dashboard.com', '/')).toBeNull();
  });

  it('rejects nested subdomains outside the canonical company host shape', () => {
    expect(resolveTenantEntry('ops.cheonha.ev-dashboard.com', '/')).toBeNull();
  });
});
