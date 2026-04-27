import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentitySession } from '../types';

import { CompanyNavigationPolicyPage } from './CompanyNavigationPolicyPage';

const listCompanyManagerRoles = vi.fn();
const updateCompanyManagerRole = vi.fn();

vi.mock('../api/managerRoles', () => ({
  listCompanyManagerRoles: (...args: unknown[]) => listCompanyManagerRoles(...args),
  updateCompanyManagerRole: (...args: unknown[]) => updateCompanyManagerRole(...args),
}));

describe('CompanyNavigationPolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCompanyManagerRoles.mockResolvedValue({
      roles: [
        {
          company_manager_role_id: '80000000-0000-0000-0000-000000000001',
          company_id: '30000000-0000-0000-0000-000000000001',
          code: 'company_super_admin',
          display_name: '회사 전체 관리자',
          is_system_required: true,
          is_default: true,
          allowed_nav_keys: ['dashboard', 'account', 'accounts', 'company_navigation_policy'],
          assigned_count: 1,
          can_delete: false,
          delete_block_reason: '필수 역할입니다.',
        },
        {
          company_manager_role_id: '80000000-0000-0000-0000-000000000002',
          company_id: '30000000-0000-0000-0000-000000000001',
          code: 'vehicle_manager',
          display_name: '차량 관리자',
          is_system_required: false,
          is_default: true,
          allowed_nav_keys: ['dashboard', 'vehicles', 'notifications'],
          assigned_count: 1,
          can_delete: false,
          delete_block_reason: '배정된 관리자가 있습니다.',
        },
        {
          company_manager_role_id: '80000000-0000-0000-0000-000000000003',
          company_id: '30000000-0000-0000-0000-000000000001',
          code: 'settlement_manager',
          display_name: '정산 관리자',
          is_system_required: false,
          is_default: true,
          allowed_nav_keys: ['dashboard', 'settlements'],
          assigned_count: 0,
          can_delete: true,
          delete_block_reason: null,
        },
        {
          company_manager_role_id: '80000000-0000-0000-0000-000000000004',
          company_id: '30000000-0000-0000-0000-000000000001',
          code: 'custom_dispatch_manager',
          display_name: '배차 운영 관리자',
          is_system_required: false,
          is_default: false,
          allowed_nav_keys: ['dashboard', 'dispatch'],
          assigned_count: 0,
          can_delete: true,
          delete_block_reason: null,
        },
        {
          company_manager_role_id: '80000000-0000-0000-0000-000000000005',
          company_id: '30000000-0000-0000-0000-000000000001',
          code: 'fleet_manager',
          display_name: '플릿 관리자',
          is_system_required: false,
          is_default: true,
          allowed_nav_keys: ['dashboard', 'dispatch'],
          assigned_count: 0,
          can_delete: true,
          delete_block_reason: null,
        },
      ],
    });
    updateCompanyManagerRole.mockResolvedValue({
      company_manager_role_id: '80000000-0000-0000-0000-000000000002',
      company_id: '30000000-0000-0000-0000-000000000001',
      code: 'vehicle_manager',
      display_name: '차량 관리자',
      is_system_required: false,
      is_default: true,
      allowed_nav_keys: ['dashboard', 'vehicles', 'vehicle_assignments'],
      assigned_count: 1,
      can_delete: false,
      delete_block_reason: '배정된 관리자가 있습니다.',
    });
  });

  const session: IdentitySession = {
    accessToken: 'token',
    sessionKind: 'normal',
    email: 'company-admin@example.com',
    identity: {
      identityId: '10000000-0000-0000-0000-000000000001',
      name: '회사 전체 관리자',
      birthDate: '1970-01-01',
      status: 'active',
    },
    activeAccount: {
      accountType: 'manager',
      accountId: '20000000-0000-0000-0000-000000000001',
      companyId: '30000000-0000-0000-0000-000000000001',
      roleType: 'company_super_admin',
      roleDisplayName: '회사 전체 관리자',
    },
    availableAccountTypes: ['manager'],
  };

  it('loads company manager roles and saves selected role policy', async () => {
    render(<CompanyNavigationPolicyPage client={{ request: vi.fn() }} session={session} />);

    await screen.findByRole('heading', { name: '회사 메뉴 정책' });
    expect(document.querySelector('.page-layout.page-layout-template-workbench')).not.toBeNull();
    expect(listCompanyManagerRoles).toHaveBeenCalledWith(
      expect.anything(),
      '30000000-0000-0000-0000-000000000001',
    );
    expect(screen.getByRole('option', { name: '배차 운영 관리자' })).toBeInTheDocument();
    expect(screen.queryByLabelText('알림')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByLabelText('차량 배정'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(updateCompanyManagerRole).toHaveBeenCalledWith(
        expect.anything(),
        '80000000-0000-0000-0000-000000000002',
        {
          allowedNavKeys: ['dashboard', 'vehicles', 'vehicle_assignments'],
        },
      );
    });

    expect(updateCompanyManagerRole.mock.calls[0][2].allowedNavKeys).not.toContain('notifications');
  });

  it('omits legacy notifications keys from untouched backend role payloads on save', async () => {
    render(<CompanyNavigationPolicyPage client={{ request: vi.fn() }} session={session} />);

    await screen.findByRole('heading', { name: '회사 메뉴 정책' });
    expect(screen.queryByLabelText('알림')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(updateCompanyManagerRole).toHaveBeenCalledWith(
        expect.anything(),
        '80000000-0000-0000-0000-000000000002',
        {
          allowedNavKeys: ['dashboard', 'vehicles'],
        },
      );
    });
  });
});
