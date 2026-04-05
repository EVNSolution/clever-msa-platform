import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SessionPayload } from '../api/http';
import { AccountPage } from './AccountPage';

const apiMocks = vi.hoisted(() => ({
  getIdentityProfile: vi.fn(),
  updateIdentityProfile: vi.fn(),
  getIdentityConsent: vi.fn(),
  withdrawIdentityConsent: vi.fn(),
  listIdentityLoginMethods: vi.fn(),
  createIdentityLoginMethod: vi.fn(),
  deleteIdentityLoginMethod: vi.fn(),
  updateIdentityPassword: vi.fn(),
  listMySignupRequests: vi.fn(),
  createMySignupRequest: vi.fn(),
  cancelMySignupRequest: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/identity', () => ({
  getIdentityProfile: apiMocks.getIdentityProfile,
  updateIdentityProfile: apiMocks.updateIdentityProfile,
  getIdentityConsent: apiMocks.getIdentityConsent,
  withdrawIdentityConsent: apiMocks.withdrawIdentityConsent,
  listIdentityLoginMethods: apiMocks.listIdentityLoginMethods,
  createIdentityLoginMethod: apiMocks.createIdentityLoginMethod,
  deleteIdentityLoginMethod: apiMocks.deleteIdentityLoginMethod,
  updateIdentityPassword: apiMocks.updateIdentityPassword,
  listMySignupRequests: apiMocks.listMySignupRequests,
  createMySignupRequest: apiMocks.createMySignupRequest,
  cancelMySignupRequest: apiMocks.cancelMySignupRequest,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

const session: SessionPayload = {
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
    accountType: 'manager',
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin',
  },
  availableAccountTypes: ['manager'],
};

describe('AccountPage', () => {
  it('loads self-service data and supports profile update plus request create/cancel', async () => {
    apiMocks.getIdentityProfile.mockResolvedValue({
      identity_id: session.identity.identityId,
      name: session.identity.name,
      birth_date: session.identity.birthDate,
      status: 'active',
    });
    apiMocks.getIdentityConsent.mockResolvedValue({
      privacy_policy_version: 'v1',
      privacy_policy_consented: true,
      privacy_policy_consented_at: '2026-04-05T10:00:00Z',
      location_policy_version: 'v1',
      location_policy_consented: true,
      location_policy_consented_at: '2026-04-05T10:00:00Z',
    });
    apiMocks.listIdentityLoginMethods.mockResolvedValue({
      methods: [
        {
          identity_login_method_id: '50000000-0000-0000-0000-000000000001',
          method_type: 'email',
          verified_at: '2026-04-05T10:00:00Z',
          value: 'manager@example.com',
        },
      ],
    });
    apiMocks.listMySignupRequests.mockResolvedValue({
      identity: {
        identity_id: session.identity.identityId,
        name: session.identity.name,
        birth_date: session.identity.birthDate,
        status: 'active',
      },
      inquiry_message: '관련 문의는 관리자에게 문의하세요.',
      requests: [
        {
          identity_signup_request_id: '70000000-0000-0000-0000-000000000001',
          identity: {
            identity_id: session.identity.identityId,
            name: session.identity.name,
            birth_date: session.identity.birthDate,
            status: 'active',
          },
          request_type: 'manager_account_create',
          request_display_name: '회사 변경 요청',
          status: 'pending',
          status_message: '검토 중입니다.',
          company_id: '30000000-0000-0000-0000-000000000001',
          requested_at: '2026-04-05T10:00:00Z',
        },
      ],
    });
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: '기존 회사' },
      { company_id: '30000000-0000-0000-0000-000000000002', name: '새 회사' },
    ]);
    apiMocks.updateIdentityProfile.mockResolvedValue({
      identity_id: session.identity.identityId,
      name: '변경된 관리자',
      birth_date: session.identity.birthDate,
      status: 'active',
    });
    apiMocks.createMySignupRequest.mockResolvedValue({
      identity_signup_request_id: '70000000-0000-0000-0000-000000000002',
      identity: {
        identity_id: session.identity.identityId,
        name: session.identity.name,
        birth_date: session.identity.birthDate,
        status: 'active',
      },
      request_type: 'driver_account_create',
      request_display_name: '배송원 계정 신청',
      status: 'pending',
      status_message: '검토 중입니다.',
      company_id: '30000000-0000-0000-0000-000000000002',
      requested_at: '2026-04-05T11:00:00Z',
    });
    apiMocks.cancelMySignupRequest.mockResolvedValue({
      identity_signup_request_id: '70000000-0000-0000-0000-000000000001',
      identity: {
        identity_id: session.identity.identityId,
        name: session.identity.name,
        birth_date: session.identity.birthDate,
        status: 'active',
      },
      request_type: 'manager_account_create',
      request_display_name: '회사 변경 요청',
      status: 'rejected',
      status_message: '반려되었습니다.',
      company_id: '30000000-0000-0000-0000-000000000001',
      requested_at: '2026-04-05T10:00:00Z',
    });

    render(<AccountPage client={{ request: vi.fn() }} session={session} />);

    await screen.findByDisplayValue('관리자');
    expect(screen.getByText('현재 웹 권한')).toBeInTheDocument();
    expect(screen.getByText(/현재 권한:\s*회사 전체 관리자/)).toBeInTheDocument();
    expect(screen.getAllByText('기존 회사').length).toBeGreaterThan(0);
    expect(screen.getByText('관련 문의는 관리자에게 문의하세요.')).toBeInTheDocument();
    expect(screen.getByText('회사 변경 요청')).toBeInTheDocument();
    expect(screen.getByText('manager@example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '변경된 관리자' } });
    fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));

    await waitFor(() => {
      expect(apiMocks.updateIdentityProfile).toHaveBeenCalledWith(expect.anything(), {
        name: '변경된 관리자',
        birth_date: '1990-01-01',
      });
    });

    fireEvent.change(screen.getByLabelText('회사 선택'), {
      target: { value: '30000000-0000-0000-0000-000000000002' },
    });
    fireEvent.change(screen.getByLabelText('요청 종류'), {
      target: { value: 'driver_account_create' },
    });
    fireEvent.click(screen.getByLabelText('회사 변경 요청으로 제출'));
    expect(screen.getByText('회사 변경 요청은 승인되면 기존 세션이 종료되고 새 회사 기준으로 다시 진입합니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '회사 변경 요청 제출' }));

    await waitFor(() => {
      expect(apiMocks.createMySignupRequest).toHaveBeenCalledWith(expect.anything(), {
        company_id: '30000000-0000-0000-0000-000000000002',
        request_type: 'driver_account_create',
        is_re_request: true,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '요청 취소' }));
    await waitFor(() => {
      expect(apiMocks.cancelMySignupRequest).toHaveBeenCalledWith(
        expect.anything(),
        '70000000-0000-0000-0000-000000000001',
      );
    });
  });
});
