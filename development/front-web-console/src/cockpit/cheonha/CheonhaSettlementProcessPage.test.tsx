import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HttpClient, SessionPayload } from '../../api/http';
import { CheonhaSettlementProcessPage } from './CheonhaSettlementProcessPage';

const settlementInputsSpy = vi.fn();

vi.mock('../../api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([]),
  listFleets: vi.fn().mockResolvedValue([
    {
      fleet_id: 'fleet-1',
      company_id: 'company-1',
      name: '천하 메인 플릿',
    },
  ]),
}));

vi.mock('../../pages/SettlementInputsPage', async () => {
  const { useSettlementFlow } = await vi.importActual<typeof import('../../components/SettlementFlowContext')>(
    '../../components/SettlementFlowContext',
  );

  return {
    SettlementInputsPage: (props: unknown) => {
      const flow = useSettlementFlow();
      settlementInputsSpy({ ...((props ?? {}) as Record<string, unknown>), flow });
      return (
        <section>
          <h2>정산 입력 요약</h2>
          <p>{flow.isLoading ? '문맥 로딩 중' : `문맥:${flow.selectedCompanyId}/${flow.selectedFleetId}`}</p>
        </section>
      );
    },
  };
});

describe('CheonhaSettlementProcessPage', () => {
  it('renders the existing read and snapshot workflow surface inside the settlement flow provider', async () => {
    const client = { request: vi.fn() } satisfies HttpClient;
    const session = {
      accessToken: 'token',
      sessionKind: 'normal',
      email: 'manager@example.com',
      identity: {
        identityId: 'identity-1',
        name: 'Manager',
        birthDate: '1990-01-01',
        status: 'active',
      },
      activeAccount: {
        accountType: 'manager',
        accountId: 'account-1',
        companyId: 'company-1',
        roleType: 'company_super_admin',
        roleDisplayName: '회사 관리자',
      },
      availableAccountTypes: ['manager'],
    } satisfies SessionPayload;

    render(<CheonhaSettlementProcessPage client={client} session={session} />);

    const workspacePanel = screen.getByTestId('settlement-workspace-panel');
    const processHeading = screen.getByRole('heading', { level: 2, name: '정산 입력 요약' });

    expect(processHeading).toBeInTheDocument();
    expect(workspacePanel).toBeInTheDocument();
    expect(within(workspacePanel).getByRole('heading', { level: 2, name: '정산 입력 요약' })).toBeInTheDocument();
    await waitFor(() => {
      expect(settlementInputsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          client,
          dispatchBoardsPath: '/settlement/dispatch',
          flow: expect.objectContaining({
            isLoading: true,
            showFleetSelector: true,
          }),
          settlementRunsPath: '/settlement/process',
        }),
      );
    });
  });
});
