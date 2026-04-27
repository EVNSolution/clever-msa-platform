import { useEffect, useMemo, useState } from 'react';

import { PageLayout } from '../components/PageLayout';
import type { HttpClient, SessionPayload } from '../api/http';
import { getErrorMessage } from '../api/http';
import { listCompanyManagerRoles, updateCompanyManagerRole } from '../api/managerRoles';
import { allNavItemKeys } from '../authScopes';
import type { CompanyManagerRole } from '../types';
import { formatProtectedIdentifier } from '../uiLabels';

const NAV_GROUPS: { label: string; items: { key: string; label: string }[] }[] = [
  {
    label: '기본',
    items: [
      { key: 'dashboard', label: '대시보드' },
      { key: 'account', label: '내 계정' },
    ],
  },
  {
    label: '운영',
    items: [
      { key: 'accounts', label: '계정 요청' },
      { key: 'announcements', label: '공지' },
      { key: 'support', label: '지원' },
    ],
  },
  {
    label: '조직/배차',
    items: [
      { key: 'companies', label: '회사' },
      { key: 'regions', label: '권역' },
      { key: 'dispatch', label: '배차' },
    ],
  },
  {
    label: '현장',
    items: [
      { key: 'drivers', label: '배송원' },
      { key: 'personnel_documents', label: '인사문서' },
      { key: 'vehicles', label: '차량' },
      { key: 'vehicle_assignments', label: '차량 배정' },
      { key: 'settlements', label: '정산' },
    ],
  },
];

const EDITABLE_NAV_KEYS = allNavItemKeys.filter(
  (key) => key !== 'manager_navigation_policy' && key !== 'company_navigation_policy',
);

function normalizeEditableNavKeys(navKeys: readonly string[]) {
  return EDITABLE_NAV_KEYS.filter((key) => navKeys.includes(key));
}

function normalizeCompanyManagerRole(role: CompanyManagerRole): CompanyManagerRole {
  return {
    ...role,
    allowed_nav_keys: normalizeEditableNavKeys(role.allowed_nav_keys),
  };
}

type Props = {
  client: HttpClient;
  session: SessionPayload;
};

export function CompanyNavigationPolicyPage({ client, session }: Props) {
  const activeCompanyId = session.activeAccount?.companyId ?? '';
  const [roles, setRoles] = useState<CompanyManagerRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const editableRoles = useMemo(
    () => roles.filter((role) => role.code !== 'company_super_admin'),
    [roles],
  );

  const selectedRole = useMemo(
    () =>
      editableRoles.find((role) => role.company_manager_role_id === selectedRoleId) ??
      editableRoles[0] ??
      null,
    [editableRoles, selectedRoleId],
  );

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (!activeCompanyId) {
      setRoles([]);
      setSelectedRoleId('');
      setErrorMessage('현재 회사 정보가 없습니다.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void listCompanyManagerRoles(client, activeCompanyId)
      .then((response) => {
        if (ignore) {
          return;
        }
        const normalizedRoles = response.roles.map(normalizeCompanyManagerRole);
        setRoles(normalizedRoles);
        const firstEditableRole =
          normalizedRoles.find((role) => role.code !== 'company_super_admin') ?? null;
        if (!normalizedRoles.some((role) => role.company_manager_role_id === selectedRoleId)) {
          setSelectedRoleId(firstEditableRole?.company_manager_role_id ?? '');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error, '회사 메뉴 정책을 불러올 수 없습니다.'));
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeCompanyId, client]);

  function toggleNavKey(navKey: string) {
    if (!selectedRole) {
      return;
    }

    setRoles((current) =>
      current.map((role) => {
        if (role.company_manager_role_id !== selectedRole.company_manager_role_id) {
          return role;
        }
        const nextKeys = role.allowed_nav_keys.includes(navKey)
          ? role.allowed_nav_keys.filter((key) => key !== navKey)
          : [...role.allowed_nav_keys, navKey];
        return {
          ...role,
          allowed_nav_keys: normalizeEditableNavKeys(nextKeys),
        };
      }),
    );
  }

  async function handleSave() {
    if (!selectedRole) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const normalizedAllowedNavKeys = normalizeEditableNavKeys(selectedRole.allowed_nav_keys);
      const updatedRole = await updateCompanyManagerRole(client, selectedRole.company_manager_role_id, {
        allowedNavKeys: normalizedAllowedNavKeys,
      });
      setRoles((current) =>
        current.map((role) =>
          role.company_manager_role_id === updatedRole.company_manager_role_id
            ? normalizeCompanyManagerRole(updatedRole)
            : role,
        ),
      );
      setStatusMessage('회사 메뉴 정책을 저장했습니다.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '회사 메뉴 정책을 저장할 수 없습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageLayout
      actions={
        <button
          className="button primary"
          disabled={isLoading || isSaving || !selectedRole}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      }
      contentClassName="stack"
      filters={
        <label className="field">
          <span>관리자 역할</span>
          <select
            disabled={isLoading || isSaving || editableRoles.length === 0}
            onChange={(event) => setSelectedRoleId(event.target.value)}
            value={selectedRole?.company_manager_role_id ?? ''}
          >
            {editableRoles.map((role) => (
              <option key={role.company_manager_role_id} value={role.company_manager_role_id}>
                {role.display_name}
              </option>
            ))}
          </select>
        </label>
      }
      subtitle="현재 회사 역할에만 적용되는 메뉴 공개 범위를 조정합니다."
      template="workbench"
      title="회사 메뉴 정책"
    >
      <p className="helper-text">회사 식별값: {formatProtectedIdentifier(activeCompanyId)}</p>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {statusMessage ? <p className="form-success">{statusMessage}</p> : null}

      <section className="panel stack gap-md">

        {selectedRole ? (
          <p className="helper-text">
            선택 역할: {selectedRole.display_name} · 배정 {selectedRole.assigned_count}명
          </p>
        ) : (
          <p className="helper-text">편집 가능한 역할이 없습니다.</p>
        )}

        {NAV_GROUPS.map((group) => (
          <section className="stack gap-sm" key={group.label}>
            <h2>{group.label}</h2>
            <div className="stack gap-xs">
              {group.items.map((item) => {
                const checked = selectedRole?.allowed_nav_keys.includes(item.key) ?? false;
                return (
                  <label key={item.key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <input
                      checked={checked}
                      disabled={!selectedRole || isLoading || isSaving}
                      onChange={() => toggleNavKey(item.key)}
                      type="checkbox"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </PageLayout>
  );
}
