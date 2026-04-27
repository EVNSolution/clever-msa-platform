import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ManagerNavigationPolicyPage } from './ManagerNavigationPolicyPage';

const listCompanies = vi.fn();
const listCompanyManagerRoles = vi.fn();
const updateCompanyManagerRole = vi.fn();

vi.mock('../api/organization', () => ({
  listCompanies: (...args: unknown[]) => listCompanies(...args),
}));

vi.mock('../api/managerRoles', () => ({
  listCompanyManagerRoles: (...args: unknown[]) => listCompanyManagerRoles(...args),
  updateCompanyManagerRole: (...args: unknown[]) => updateCompanyManagerRole(...args),
}));

const companyARoles = [
  {
    company_manager_role_id: 'role-company-super-admin',
    company_id: 'company-a',
    code: 'company_super_admin',
    display_name: '회사 전체 관리자',
    is_system_required: true,
    is_default: true,
    allowed_nav_keys: [
      'dashboard',
      'account',
      'manager_navigation_policy',
      'manager_roles',
      'company_navigation_policy',
      'accounts',
      'announcements',
      'support',
      'companies',
      'regions',
      'vehicles',
      'vehicle_assignments',
      'drivers',
      'personnel_documents',
      'dispatch',
      'settlements',
    ],
    assigned_count: 1,
    can_delete: false,
    delete_block_reason: '필수 역할은 삭제할 수 없습니다.',
  },
  {
    company_manager_role_id: 'role-vehicle-manager',
    company_id: 'company-a',
    code: 'vehicle_manager',
    display_name: '차량 관리자',
    is_system_required: false,
    is_default: true,
    allowed_nav_keys: [
      'dashboard',
      'account',
      'accounts',
      'announcements',
      'support',
      'regions',
      'vehicles',
      'drivers',
      'personnel_documents',
    ],
    assigned_count: 1,
    can_delete: false,
    delete_block_reason: '배정된 관리자가 있는 역할은 삭제할 수 없습니다.',
  },
];

describe('ManagerNavigationPolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCompanies.mockResolvedValue([
      { company_id: 'company-a', name: '이브이솔루션' },
      { company_id: 'company-b', name: '동부물류' },
    ]);
    listCompanyManagerRoles.mockResolvedValue({ roles: companyARoles });
    updateCompanyManagerRole.mockResolvedValue({
      ...companyARoles[1],
      allowed_nav_keys: [
        'dashboard',
        'account',
        'accounts',
        'announcements',
        'support',
        'regions',
        'vehicles',
        'vehicle_assignments',
        'drivers',
        'personnel_documents',
      ],
    });
  });

  it('loads company roles and renders non-editable sidebar items', async () => {
    render(
      <ManagerNavigationPolicyPage
        client={{
          request: vi.fn(),
        }}
      />,
    );

    await screen.findByRole('heading', { name: '메뉴 정책' });
    expect(document.querySelector('.page-layout.page-layout-template-workbench')).not.toBeNull();
    await waitFor(() =>
      expect(listCompanyManagerRoles).toHaveBeenCalledWith(expect.anything(), 'company-a'),
    );
    expect(screen.getByRole('button', { name: '회사' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '역할' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '회사 전체 관리자 편집' })).toBeInTheDocument();
    expect(screen.getAllByText('메뉴 정책').length).toBeGreaterThan(1);
    expect(screen.getAllByText('회사 메뉴 정책').length).toBeGreaterThan(1);
    expect(screen.getAllByText('설정 불가').length).toBeGreaterThan(1);
    expect(screen.getAllByText('전체 허용').length).toBeGreaterThan(1);
    expect(screen.queryByText('묶음 전체 허용')).not.toBeInTheDocument();
    expect(screen.queryByText('정책 화면 자체이므로 항상 시스템 관리자에게 고정됩니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('회사별 override 화면이므로 전역 정책 편집 대상이 아닙니다.')).not.toBeInTheDocument();
  });

  it('switches selected role using the role dropdown', async () => {
    render(
      <ManagerNavigationPolicyPage
        client={{
          request: vi.fn(),
        }}
      />,
    );

    await screen.findByRole('heading', { name: '메뉴 정책' });
    await waitFor(() =>
      expect(listCompanyManagerRoles).toHaveBeenCalledWith(expect.anything(), 'company-a'),
    );

    fireEvent.click(screen.getByRole('button', { name: '역할' }));
    fireEvent.click(screen.getByRole('option', { name: '차량 관리자' }));

    expect(screen.getByRole('heading', { name: '차량 관리자 편집' })).toBeInTheDocument();
  });

  it('updates preview and saves the selected role policy through API', async () => {
    render(
      <ManagerNavigationPolicyPage
        client={{
          request: vi.fn(),
        }}
      />,
    );

    await screen.findByRole('heading', { name: '메뉴 정책' });
    await waitFor(() =>
      expect(listCompanyManagerRoles).toHaveBeenCalledWith(expect.anything(), 'company-a'),
    );

    fireEvent.click(screen.getByRole('button', { name: '역할' }));
    fireEvent.click(screen.getByRole('option', { name: '차량 관리자' }));

    expect(screen.getByText('저장된 메뉴 9개')).toBeInTheDocument();
    expect(screen.getByText('현재 허용 9개')).toBeInTheDocument();
    expect(screen.queryByText('변경 중')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();

    const preview = screen.getByTestId('navigation-policy-preview');
    const vehicleAssignmentPreviewItem = within(preview).getByText('차량 배정').closest('.policy-preview-item');
    expect(vehicleAssignmentPreviewItem).not.toBeNull();
    expect(within(vehicleAssignmentPreviewItem as HTMLElement).getByText('금지')).toBeInTheDocument();
    expect(vehicleAssignmentPreviewItem).toHaveAttribute('data-policy-state', 'deny');

    fireEvent.click(screen.getByLabelText('차량 배정'));
    expect(within(vehicleAssignmentPreviewItem as HTMLElement).getByText('허용')).toBeInTheDocument();
    expect(vehicleAssignmentPreviewItem).toHaveAttribute('data-policy-state', 'allow');
    const vehicleAssignmentEditorCard = screen.getByLabelText('차량 배정').closest('.policy-item-card');
    expect(vehicleAssignmentEditorCard).not.toBeNull();
    const vehicleAssignmentEditorBadge = within(vehicleAssignmentEditorCard as HTMLElement).getByText('허용');
    expect(vehicleAssignmentEditorBadge).toHaveClass('policy-state-pill');
    expect(vehicleAssignmentEditorBadge).toHaveAttribute('data-policy-state', 'allow');
    const vehicleAssignmentPreviewBadge = within(vehicleAssignmentPreviewItem as HTMLElement).getByText('허용');
    expect(vehicleAssignmentPreviewBadge).toHaveClass('policy-state-pill');
    expect(screen.getByText('변경 중')).toBeInTheDocument();
    expect(screen.getByText('변경 중')).toHaveClass('policy-state-pill');
    expect(screen.getByRole('button', { name: '취소' })).toHaveClass('policy-action-button');
    expect(screen.getByRole('button', { name: '저장' })).toHaveClass('policy-action-button');
    expect(screen.getByRole('button', { name: '취소' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(updateCompanyManagerRole).toHaveBeenCalledWith(expect.anything(), 'role-vehicle-manager', {
        allowedNavKeys: [
          'dashboard',
          'account',
          'accounts',
          'announcements',
          'support',
          'regions',
          'vehicles',
          'vehicle_assignments',
          'drivers',
          'personnel_documents',
        ],
      }),
    );
    expect(screen.queryByText('변경 중')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '현재 역할 저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장된 정책으로 되돌리기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '취소' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
  });

  it('keeps editor and preview headers outside the scroll regions', async () => {
    render(
      <ManagerNavigationPolicyPage
        client={{
          request: vi.fn(),
        }}
      />,
    );

    await screen.findByRole('heading', { name: '메뉴 정책' });

    const editor = screen.getByRole('heading', { name: '회사 전체 관리자 편집' }).closest('.policy-editor');
    const preview = screen.getByTestId('navigation-policy-preview');
    expect(editor).not.toBeNull();
    expect(preview).not.toBeNull();
    expect(editor).not.toHaveClass('policy-scroll-column');
    expect(preview).not.toHaveClass('policy-scroll-column');
    expect((editor as HTMLElement).querySelector('.policy-group-stack')).toHaveClass('policy-scroll-column');
    expect((preview as HTMLElement).querySelector('.policy-preview-shell')).toHaveClass('policy-scroll-column');
  });
});
