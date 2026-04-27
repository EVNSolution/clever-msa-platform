import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HttpClient, SessionPayload } from '../../api/http';
import { CheonhaDispatchDataPage } from './CheonhaDispatchDataPage';

const dispatchUploadsSpy = vi.fn();

vi.mock('../../pages/DispatchUploadsPage', () => ({
  DispatchUploadsPage: (props: unknown) => {
    dispatchUploadsSpy(props);
    return <section><h2>배차표 업로드</h2><p>dispatch-upload workflow surface</p></section>;
  },
}));

describe('CheonhaDispatchDataPage', () => {
  it('renders the existing dispatch upload workflow surface inside the settlement workspace', () => {
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

    render(<CheonhaDispatchDataPage client={client} session={session} />);

    const workspacePanel = screen.getByTestId('settlement-workspace-panel');
    const dispatchHeading = screen.getByRole('heading', { level: 2, name: '배차표 업로드' });

    expect(dispatchHeading).toBeInTheDocument();
    expect(workspacePanel).toBeInTheDocument();
    expect(within(workspacePanel).getByRole('heading', { level: 2, name: '배차표 업로드' })).toBeInTheDocument();
    expect(within(workspacePanel).getByText('dispatch-upload workflow surface')).toBeInTheDocument();
    expect(dispatchUploadsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        client,
        dispatchBoardsPath: '/settlement/dispatch',
        layoutVariant: 'settlement',
        session,
        settlementInputsPath: '/settlement/process',
      }),
    );
  });
});
