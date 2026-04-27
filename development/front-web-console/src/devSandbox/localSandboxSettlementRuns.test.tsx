import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHttpClient } from '../api/http';
import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import { SettlementRunsPage } from '../pages/SettlementRunsPage';
import { resolveDevSessionPreset } from './sessionPresets';
import { installFetchMock } from './installFetchMock';
import { resetLocalSandboxMockState } from './mockState';

const cheonhaSession = resolveDevSessionPreset('cheonha.ev-dashboard.com')!.session;

describe('local sandbox settlement runs', () => {
  let uninstallFetchMock: (() => void) | undefined;

  beforeEach(() => {
    resetLocalSandboxMockState();
    uninstallFetchMock = installFetchMock();
  });

  afterEach(() => {
    uninstallFetchMock?.();
    uninstallFetchMock = undefined;
  });

  it('creates, updates, and deletes a settlement run through the real page code and mocked /api surface', async () => {
    const client = createHttpClient({
      baseUrl: '/api',
      getAccessToken: () => cheonhaSession.accessToken,
      onSessionRefresh: vi.fn(),
      onUnauthorized: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={client} session={cheonhaSession}>
          <SettlementRunsPage client={client} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '정산 실행 요약' })).toBeInTheDocument();
    expect(await screen.findByText('현재 문맥에 정산 실행이 없습니다.')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '정산 실행 생성' }));

    const dialog = await screen.findByRole('dialog', { name: '정산 실행 생성' });
    await user.click(within(dialog).getByRole('button', { name: '정산 실행 생성' }));

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: '천하 메인 플릿' })).toBeInTheDocument();
    });
    expect(screen.getByRole('cell', { name: '2026-03-01 ~ 2026-03-31' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '초안' })).toBeInTheDocument();

    await user.click(screen.getByRole('cell', { name: '2026-03-01 ~ 2026-03-31' }));

    const editDialog = await screen.findByRole('dialog', { name: '정산 실행 수정' });
    await user.selectOptions(within(editDialog).getByRole('combobox', { name: '상태' }), 'approved');
    await user.click(within(editDialog).getByRole('button', { name: '정산 실행 수정' }));

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: '승인됨' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(screen.getByText('현재 문맥에 정산 실행이 없습니다.')).toBeInTheDocument();
    });
  });
});
