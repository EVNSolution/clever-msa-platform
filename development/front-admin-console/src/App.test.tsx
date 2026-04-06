import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const session = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'manager@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin',
  },
  availableAccountTypes: ['manager'],
};

vi.mock('./sessionPersistence', () => ({
  clearStoredSession: vi.fn(),
  loadStoredSession: vi.fn(() => session),
  persistSession: vi.fn(),
}));

vi.mock('./api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([]),
  listFleets: vi.fn().mockResolvedValue([]),
  listPublicCompanies: vi.fn().mockResolvedValue([]),
}));

describe('Admin App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('uses the unified dashboard as the root route', async () => {
    render(<App />);

    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
  });
});
