import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HttpClient } from '../api/http';
import { ManagerRolesPage } from './ManagerRolesPage';

const listCompanies = vi.fn();
const listCompanyManagerRoles = vi.fn();
const createCompanyManagerRole = vi.fn();
const reorderCompanyManagerRoles = vi.fn();
const updateCompanyManagerRole = vi.fn();
const deleteCompanyManagerRole = vi.fn();
const onShowNotice = vi.fn();

vi.mock('../api/organization', () => ({
  listCompanies: (...args: unknown[]) => listCompanies(...args),
}));

vi.mock('../api/managerRoles', () => ({
  listCompanyManagerRoles: (...args: unknown[]) => listCompanyManagerRoles(...args),
  createCompanyManagerRole: (...args: unknown[]) => createCompanyManagerRole(...args),
  reorderCompanyManagerRoles: (...args: unknown[]) => reorderCompanyManagerRoles(...args),
  updateCompanyManagerRole: (...args: unknown[]) => updateCompanyManagerRole(...args),
  deleteCompanyManagerRole: (...args: unknown[]) => deleteCompanyManagerRole(...args),
}));

const client = { request: vi.fn() } as unknown as HttpClient;

const systemAdminSession = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'sysadmin@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '시스템 관리자',
    birthDate: '1970-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'system_admin' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
  },
  availableAccountTypes: ['system_admin'],
};

const companyARoles = [
  {
    company_manager_role_id: 'role-company-super-admin',
    company_id: 'company-a',
    code: 'company_super_admin',
    display_name: '회사 전체 관리자',
    scope_level: 'company',
    is_system_required: true,
    is_default: true,
    assigned_count: 1,
    can_delete: false,
    delete_block_reason: '필수 역할은 삭제할 수 없습니다.',
  },
  {
    company_manager_role_id: 'role-vehicle-manager',
    company_id: 'company-a',
    code: 'vehicle_manager',
    display_name: '차량 관리자',
    scope_level: 'company',
    is_system_required: false,
    is_default: true,
    assigned_count: 1,
    can_delete: false,
    delete_block_reason: '배정된 관리자가 있는 역할은 삭제할 수 없습니다.',
  },
  {
    company_manager_role_id: 'role-custom-1',
    company_id: 'company-a',
    code: 'custom_role_1',
    display_name: '배차 품질 관리자',
    scope_level: 'fleet',
    is_system_required: false,
    is_default: false,
    assigned_count: 0,
    can_delete: true,
    delete_block_reason: null,
  },
];

describe('ManagerRolesPage', () => {
  beforeEach(() => {
    listCompanies.mockReset();
    listCompanyManagerRoles.mockReset();
    createCompanyManagerRole.mockReset();
    reorderCompanyManagerRoles.mockReset();
    updateCompanyManagerRole.mockReset();
    deleteCompanyManagerRole.mockReset();
    onShowNotice.mockReset();

    listCompanies.mockResolvedValue([
      { company_id: 'company-a', name: '에이 법인' },
      { company_id: 'company-b', name: '비 법인' },
    ]);
    listCompanyManagerRoles.mockResolvedValue({ roles: companyARoles });
  });

  it('loads company roles from API and shows delete restrictions', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    expect(await screen.findByRole('heading', { name: '관리자 역할' })).toBeInTheDocument();
    expect(document.querySelector('.page-layout.page-layout-template-workbench')).not.toBeNull();
    await waitFor(() =>
      expect(listCompanyManagerRoles).toHaveBeenCalledWith(client, 'company-a'),
    );
    expect(await screen.findByText('회사 전체 관리자')).toBeInTheDocument();
    expect(screen.getByText('차량 관리자')).toBeInTheDocument();
    expect(document.querySelectorAll('.role-scope-badge')).toHaveLength(3);
    expect(screen.getAllByText('회사 역할').length).toBeGreaterThan(0);
    expect(screen.getAllByText('플릿 역할').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '배차 품질 관리자 저장' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 품질 관리자 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회사 전체 관리자 삭제' })).toBeDisabled();
    expect(screen.queryByText('필수 역할은 삭제할 수 없습니다.')).not.toBeInTheDocument();
    expect(screen.queryByText('배정된 관리자가 있는 역할은 삭제할 수 없습니다.')).not.toBeInTheDocument();
  });

  it('creates a new role through API', async () => {
    createCompanyManagerRole.mockResolvedValue({
      company_manager_role_id: 'role-custom-2',
      company_id: 'company-a',
      code: 'custom_role_2',
      display_name: '새 관리자 역할 2',
      scope_level: 'fleet',
      is_system_required: false,
      is_default: false,
      assigned_count: 0,
      can_delete: true,
      delete_block_reason: null,
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '역할 추가' }));
    const draftInput = screen.getByDisplayValue('새 관리자 역할 2');
    fireEvent.click(screen.getByRole('button', { name: '새 관리자 역할 2 적용 대상' }));
    fireEvent.click(screen.getByRole('option', { name: '플릿 역할' }));
    fireEvent.change(draftInput, { target: { value: '새 관리자 역할 2' } });
    fireEvent.click(screen.getByRole('button', { name: '새 관리자 역할 2 저장' }));

    await waitFor(() =>
      expect(createCompanyManagerRole).toHaveBeenCalledWith(client, {
        companyId: 'company-a',
        displayName: '새 관리자 역할 2',
        scopeLevel: 'fleet',
      }),
    );
    expect(await screen.findByText('새 관리자 역할 2')).toBeInTheDocument();
  });

  it('adds a draft role locally before save', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '역할 추가' }));

    expect(screen.getByDisplayValue('새 관리자 역할 2')).toBeInTheDocument();
    expect(createCompanyManagerRole).not.toHaveBeenCalled();
    expect(screen.queryByText('새 역할 적용 대상')).not.toBeInTheDocument();
  });

  it('collapses the editor after cancel', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 수정' }));
    expect(screen.getByRole('button', { name: '배차 품질 관리자 적용 대상' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 취소' }));

    expect(screen.queryByRole('button', { name: '배차 품질 관리자 적용 대상' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 품질 관리자 수정' })).toBeInTheDocument();
  });

  it('allows cancel for non-deletable system roles while editing', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('회사 전체 관리자');
    fireEvent.click(screen.getByRole('button', { name: '회사 전체 관리자 수정' }));
    expect(screen.getByRole('button', { name: '회사 전체 관리자 취소' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '회사 전체 관리자 취소' }));

    expect(screen.queryByRole('button', { name: '회사 전체 관리자 적용 대상' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회사 전체 관리자 수정' })).toBeInTheDocument();
  });

  it('renders company dropdown options with truncation-ready labels', async () => {
    listCompanies.mockResolvedValue([
      {
        company_id: 'company-a',
        name: '에이 법인 이름이 아주 길어서 드롭다운 최대 폭을 넘겨도 자연스럽게 줄여 보여야 하는 테스트 데이터',
      },
      { company_id: 'company-b', name: '비 법인' },
    ]);

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByRole('heading', { name: '관리자 역할' });
    fireEvent.click(screen.getByRole('button', { name: '회사' }));

    const longCompanyOption = await screen.findByRole('option', {
      name: '에이 법인 이름이 아주 길어서 드롭다운 최대 폭을 넘겨도 자연스럽게 줄여 보여야 하는 테스트 데이터',
    });
    const label = longCompanyOption.querySelector('.policy-dropdown-option-label');

    expect(label).not.toBeNull();
    expect(label?.textContent).toContain('에이 법인 이름이 아주 길어서');
  });

  it('renames a role through API when save is pressed', async () => {
    updateCompanyManagerRole.mockResolvedValue({
      ...companyARoles[2],
      display_name: '배차 품질 리더',
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 수정' }));
    const input = screen.getByDisplayValue('배차 품질 관리자');
    fireEvent.change(input, { target: { value: '배차 품질 리더' } });
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 리더 저장' }));

    await waitFor(() =>
      expect(updateCompanyManagerRole).toHaveBeenCalledWith(client, 'role-custom-1', {
        displayName: '배차 품질 리더',
      }),
    );
    expect(screen.queryByRole('button', { name: '배차 품질 리더 적용 대상' })).not.toBeInTheDocument();
    expect(await screen.findByText('배차 품질 리더')).toBeInTheDocument();
  });

  it('updates custom role code in edit mode', async () => {
    updateCompanyManagerRole.mockResolvedValue({
      ...companyARoles[2],
      code: 'dispatch_quality_manager',
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 수정' }));
    fireEvent.change(screen.getByLabelText('배차 품질 관리자 영문 변수명'), {
      target: { value: 'dispatch_quality_manager' },
    });
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 저장' }));

    await waitFor(() =>
      expect(updateCompanyManagerRole).toHaveBeenCalledWith(client, 'role-custom-1', {
        code: 'dispatch_quality_manager',
      }),
    );
  });

  it('collapses without API call when save is pressed with no changes', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 저장' }));

    expect(updateCompanyManagerRole).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '배차 품질 관리자 적용 대상' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '배차 품질 관리자 수정' })).toBeInTheDocument();
  });

  it('deletes a removable role through API', async () => {
    deleteCompanyManagerRole.mockResolvedValue(undefined);

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '배차 품질 관리자 삭제' }));

    await waitFor(() =>
      expect(deleteCompanyManagerRole).toHaveBeenCalledWith(client, 'role-custom-1'),
    );
    expect(screen.queryByText('배차 품질 관리자')).not.toBeInTheDocument();
  });

  it('reorders roles through the drag handle', async () => {
    reorderCompanyManagerRoles.mockResolvedValue({
      roles: [
        { ...companyARoles[2], display_order: 1 },
        { ...companyARoles[0], display_order: 2 },
        { ...companyARoles[1], display_order: 3 },
      ],
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    const sourceHandle = screen.getByRole('button', { name: '배차 품질 관리자 순서 이동' });
    const targetCard = screen.getByText('회사 전체 관리자').closest('.role-card');
    expect(targetCard).not.toBeNull();
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(sourceHandle, { dataTransfer });
    fireEvent.dragOver(targetCard!);
    await waitFor(() => {
      const roleList = document.querySelector('.role-catalog-list');
      expect(roleList?.querySelector('[data-role-id="role-custom-1"]')).toBeNull();
      expect(roleList?.querySelector('[data-placeholder-for="role-custom-1"]')).not.toBeNull();
      expect(dataTransfer.setDragImage).toHaveBeenCalled();
    });

    fireEvent.drop(targetCard!);

    await waitFor(() =>
      expect(reorderCompanyManagerRoles).toHaveBeenCalledWith(client, {
        companyId: 'company-a',
        roleIds: ['role-custom-1', 'role-company-super-admin', 'role-vehicle-manager'],
      }),
    );
  });

  it('reorders roles when dropped on the placeholder preview card', async () => {
    reorderCompanyManagerRoles.mockResolvedValue({
      roles: [
        { ...companyARoles[2], display_order: 1 },
        { ...companyARoles[0], display_order: 2 },
        { ...companyARoles[1], display_order: 3 },
      ],
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    const sourceHandle = screen.getByRole('button', { name: '배차 품질 관리자 순서 이동' });
    const targetCard = screen.getByText('회사 전체 관리자').closest('.role-card');
    expect(targetCard).not.toBeNull();
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(sourceHandle, { dataTransfer });
    fireEvent.dragOver(targetCard!);

    const placeholder = await screen.findByLabelText('배차 품질 관리자 이동 자리');
    fireEvent.dragOver(placeholder);
    fireEvent.drop(placeholder);

    await waitFor(() =>
      expect(reorderCompanyManagerRoles).toHaveBeenCalledWith(client, {
        companyId: 'company-a',
        roleIds: ['role-custom-1', 'role-company-super-admin', 'role-vehicle-manager'],
      }),
    );
  });

  it('reorders roles to the end when dropped on the bottom preview zone', async () => {
    reorderCompanyManagerRoles.mockResolvedValue({
      roles: [
        { ...companyARoles[1], display_order: 1 },
        { ...companyARoles[2], display_order: 2 },
        { ...companyARoles[0], display_order: 3 },
      ],
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    const sourceHandle = screen.getByRole('button', { name: '회사 전체 관리자 순서 이동' });
    const lastCard = screen.getByText('배차 품질 관리자').closest('.role-card');
    expect(lastCard).not.toBeNull();
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(sourceHandle, { dataTransfer });
    fireEvent.dragOver(lastCard!);

    const endPlaceholder = await screen.findByLabelText('역할 목록 맨 아래 이동 자리');
    fireEvent.dragOver(endPlaceholder);
    fireEvent.drop(endPlaceholder);

    await waitFor(() =>
      expect(reorderCompanyManagerRoles).toHaveBeenCalledWith(client, {
        companyId: 'company-a',
        roleIds: ['role-vehicle-manager', 'role-custom-1', 'role-company-super-admin'],
      }),
    );
  });

  it('restores the card when drag ends without a drop', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    const sourceHandle = screen.getByRole('button', { name: '배차 품질 관리자 순서 이동' });
    const targetCard = screen.getByText('회사 전체 관리자').closest('.role-card');
    expect(targetCard).not.toBeNull();
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(sourceHandle, { dataTransfer });
    fireEvent.dragOver(targetCard!);

    await waitFor(() => {
      const roleList = document.querySelector('.role-catalog-list');
      expect(roleList?.querySelector('[data-role-id="role-custom-1"]')).toBeNull();
      expect(roleList?.querySelector('[data-placeholder-for="role-custom-1"]')).not.toBeNull();
    });

    fireEvent.dragEnd(window);

    await waitFor(() => {
      const roleList = document.querySelector('.role-catalog-list');
      expect(roleList?.querySelector('[data-role-id="role-custom-1"]')).not.toBeNull();
      expect(roleList?.querySelector('[data-placeholder-for="role-custom-1"]')).toBeNull();
    });
  });

  it('keeps the source card in place during dragstart so the browser can capture a drag image', async () => {
    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    const sourceHandle = screen.getByRole('button', { name: '배차 품질 관리자 순서 이동' });
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      setDragImage: vi.fn(),
    };

    fireEvent.dragStart(sourceHandle, { dataTransfer });

    const roleList = document.querySelector('.role-catalog-list');
    expect(roleList?.querySelector('[data-role-id="role-custom-1"]')).not.toBeNull();
  });

  it('moves success messages to the top notice callback', async () => {
    createCompanyManagerRole.mockResolvedValue({
      company_manager_role_id: 'role-custom-2',
      company_id: 'company-a',
      code: 'custom_role_2',
      display_name: '새 관리자 역할 2',
      scope_level: 'company',
      is_system_required: false,
      is_default: false,
      assigned_count: 0,
      can_delete: true,
      delete_block_reason: null,
    });

    render(<ManagerRolesPage client={client} onShowNotice={onShowNotice} session={systemAdminSession} />);

    await screen.findByText('배차 품질 관리자');
    fireEvent.click(screen.getByRole('button', { name: '역할 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '새 관리자 역할 2 저장' }));

    await waitFor(() =>
      expect(onShowNotice).toHaveBeenCalledWith('새 관리자 역할 2 역할을 추가했습니다.', 'success'),
    );
    expect(document.querySelector('.form-success')).toBeNull();
    expect(document.querySelector('.success-banner')).toBeNull();
  });
});
