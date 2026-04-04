import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SessionPayload } from '../api/http';
import { ConsentRecoveryPage } from './ConsentRecoveryPage';

const apiMocks = vi.hoisted(() => ({
  getIdentityConsent: vi.fn(),
  recoverIdentityConsent: vi.fn(),
}));

vi.mock('../api/identity', () => ({
  getIdentityConsent: apiMocks.getIdentityConsent,
  recoverIdentityConsent: apiMocks.recoverIdentityConsent,
}));

describe('ConsentRecoveryPage', () => {
  it('loads current consent state and recovers the session', async () => {
    apiMocks.getIdentityConsent.mockResolvedValue({
      privacy_policy_version: 'v1',
      privacy_policy_consented: false,
      privacy_policy_consented_at: null,
      location_policy_version: 'v1',
      location_policy_consented: false,
      location_policy_consented_at: null,
    });
    apiMocks.recoverIdentityConsent.mockResolvedValue({
      accessToken: 'new-token',
      sessionKind: 'normal',
      email: 'manager@example.com',
      identity: {
        identityId: '10000000-0000-0000-0000-000000000001',
        name: '관리자',
        birthDate: '1990-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'manager',
        accountId: '20000000-0000-0000-0000-000000000001',
        companyId: '30000000-0000-0000-0000-000000000001',
        roleType: 'company_super_admin',
      },
      availableAccountTypes: ['manager'],
    } satisfies SessionPayload);
    const onRecovered = vi.fn();

    render(
      <ConsentRecoveryPage
        client={{ request: vi.fn() }}
        onLogout={() => undefined}
        onRecovered={onRecovered}
      />,
    );

    await screen.findByText('필수 동의를 다시 확인해야 합니다.');
    fireEvent.click(screen.getByLabelText('개인정보처리 동의'));
    fireEvent.click(screen.getByLabelText('위치기반 동의'));
    fireEvent.click(screen.getByRole('button', { name: '동의 복구' }));

    await waitFor(() => {
      expect(apiMocks.recoverIdentityConsent).toHaveBeenCalledWith(expect.anything(), {
        privacy_policy_version: 'v1',
        privacy_policy_consented: true,
        location_policy_version: 'v1',
        location_policy_consented: true,
      });
    });
    expect(onRecovered).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'new-token',
        sessionKind: 'normal',
      }),
    );
  });
});
