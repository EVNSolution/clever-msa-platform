import { useEffect, useMemo, useRef, useState } from 'react';

import { PageLayout } from '../components/PageLayout';
import type { HttpClient } from '../api/http';
import { getErrorMessage } from '../api/http';
import { listCompanyManagerRoles, updateCompanyManagerRole } from '../api/managerRoles';
import { listCompanies } from '../api/organization';
import { accountItem, dashboardItem, navigationGroups } from '../navigation';
import type { Company, CompanyManagerRole } from '../types';

const NON_EDITABLE_ITEM_KEYS = new Set(['manager_navigation_policy', 'company_navigation_policy']);

type SidebarWorkbenchItem = {
  key: string;
  label: string;
  editable: boolean;
};

type SidebarWorkbenchSection = {
  key: string;
  label: string;
  items: SidebarWorkbenchItem[];
};

function buildWorkbenchItemsForGroup(group: (typeof navigationGroups)[number]): SidebarWorkbenchItem[] {
  const itemsByKey = new Map<string, SidebarWorkbenchItem>();

  for (const item of group.items) {
    if (itemsByKey.has(item.key)) {
      continue;
    }

    const duplicateCount = group.items.filter((candidate) => candidate.key === item.key).length;
    itemsByKey.set(item.key, {
      key: item.key,
      label: duplicateCount > 1 ? group.label : item.label,
      editable: !NON_EDITABLE_ITEM_KEYS.has(item.key),
    });
  }

  return Array.from(itemsByKey.values());
}

type PolicyDropdownOption = {
  value: string;
  label: string;
};

const SIDEBAR_WORKBENCH_SECTIONS: SidebarWorkbenchSection[] = [
  {
    key: 'top-links',
    label: '상단 링크',
    items: [dashboardItem, accountItem].map((item) => ({
      key: item.key,
      label: item.label,
      editable: true,
    })),
  },
  ...navigationGroups.map((group) => ({
    key: group.key,
    label: group.label,
    items: buildWorkbenchItemsForGroup(group),
  })),
];

const EDITABLE_NAV_KEYS = SIDEBAR_WORKBENCH_SECTIONS.flatMap((section) =>
  section.items.filter((item) => item.editable).map((item) => item.key),
);
const EDITABLE_NAV_KEY_SET = new Set<string>(EDITABLE_NAV_KEYS);
const POLICY_NAV_KEY_ORDER = [
  'dashboard',
  'account',
  'manager_roles',
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
] as const;
const POLICY_NAV_KEY_ORDER_MAP = new Map<string, number>(
  POLICY_NAV_KEY_ORDER.map((key, index) => [key, index]),
);

function normalizeAllowedNavKeys(keys: string[]) {
  const seen = new Set<string>();
  return keys
    .filter((key) => {
      if (!EDITABLE_NAV_KEY_SET.has(key) || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => (POLICY_NAV_KEY_ORDER_MAP.get(left) ?? 999) - (POLICY_NAV_KEY_ORDER_MAP.get(right) ?? 999));
}

function normalizeRole(role: CompanyManagerRole): CompanyManagerRole {
  return {
    ...role,
    allowed_nav_keys: normalizeAllowedNavKeys(role.allowed_nav_keys ?? []),
  };
}

function areSameKeys(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

type PolicyDropdownProps = {
  ariaLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onSelect: (value: string) => void;
  options: PolicyDropdownOption[];
  value: string;
};

function PolicyDropdown({
  ariaLabel,
  isOpen,
  onClose,
  onToggle,
  onSelect,
  options,
  value,
}: PolicyDropdownProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <div className="policy-dropdown" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="policy-dropdown-trigger"
        onClick={onToggle}
        type="button"
      >
        <span>{selectedOption?.label ?? `${ariaLabel} 없음`}</span>
      </button>
      {isOpen ? (
        <div aria-label={ariaLabel} className="policy-dropdown-menu" role="listbox">
          {options.length ? (
            options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  aria-label={option.label}
                  aria-selected={selected}
                  className={`policy-dropdown-option${selected ? ' is-selected' : ''}`}
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {selected ? <small>선택됨</small> : null}
                </button>
              );
            })
          ) : (
            <div className="policy-dropdown-empty">선택 가능한 항목이 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  client: HttpClient;
};

export function ManagerNavigationPolicyPage({ client }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<CompanyManagerRole[]>([]);
  const [draftAllowedNavKeysByRoleId, setDraftAllowedNavKeysByRoleId] = useState<Record<string, string[]>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<'company' | 'role' | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    setIsBootstrapping(true);
    setErrorMessage(null);
    setStatusMessage(null);

    void listCompanies(client)
      .then((response) => {
        if (ignore) {
          return;
        }
        setCompanies(response);
        setSelectedCompanyId((current) => current || response[0]?.company_id || '');
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error, '회사 목록을 불러올 수 없습니다.'));
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [client]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setRoles([]);
      setSelectedRoleId('');
      return;
    }

    let ignore = false;
    setIsRolesLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    void listCompanyManagerRoles(client, selectedCompanyId)
      .then((response) => {
        if (ignore) {
          return;
        }
        const normalizedRoles = response.roles.map(normalizeRole);
        setRoles(normalizedRoles);
        setDraftAllowedNavKeysByRoleId((current) => {
          const next = { ...current };
          normalizedRoles.forEach((role) => {
            next[role.company_manager_role_id] = role.allowed_nav_keys;
          });
          return next;
        });
        setSelectedRoleId((current) => {
          if (current && normalizedRoles.some((role) => role.company_manager_role_id === current)) {
            return current;
          }
          return normalizedRoles[0]?.company_manager_role_id ?? '';
        });
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error, '관리자 역할을 불러올 수 없습니다.'));
          setRoles([]);
          setSelectedRoleId('');
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsRolesLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [client, selectedCompanyId]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.company_manager_role_id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const selectedDraftAllowedNavKeys = useMemo(() => {
    if (!selectedRole) {
      return [];
    }
    return draftAllowedNavKeysByRoleId[selectedRole.company_manager_role_id] ?? selectedRole.allowed_nav_keys;
  }, [draftAllowedNavKeysByRoleId, selectedRole]);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.company_id, label: company.name })),
    [companies],
  );
  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.company_manager_role_id, label: role.display_name })),
    [roles],
  );

  function isRoleDirty(roleId: string) {
    const saved = roles.find((role) => role.company_manager_role_id === roleId)?.allowed_nav_keys ?? [];
    const draft = draftAllowedNavKeysByRoleId[roleId] ?? saved;
    return !areSameKeys(saved, draft);
  }

  function updateDraftForSelectedRole(nextKeys: string[]) {
    if (!selectedRole) {
      return;
    }
    setDraftAllowedNavKeysByRoleId((current) => ({
      ...current,
      [selectedRole.company_manager_role_id]: normalizeAllowedNavKeys(nextKeys),
    }));
  }

  function toggleNavKey(navKey: string) {
    const nextKeys = selectedDraftAllowedNavKeys.includes(navKey)
      ? selectedDraftAllowedNavKeys.filter((key) => key !== navKey)
      : [...selectedDraftAllowedNavKeys, navKey];
    updateDraftForSelectedRole(nextKeys);
  }

  function toggleSectionCollapsed(sectionKey: string) {
    setCollapsedSections((current) =>
      current.includes(sectionKey) ? current.filter((key) => key !== sectionKey) : [...current, sectionKey],
    );
  }

  function toggleSectionKeys(section: SidebarWorkbenchSection, enableAll: boolean) {
    const sectionEditableKeys = section.items.filter((item) => item.editable).map((item) => item.key);
    const nextSet = new Set(selectedDraftAllowedNavKeys);
    sectionEditableKeys.forEach((key) => {
      if (enableAll) {
        nextSet.add(key);
      } else {
        nextSet.delete(key);
      }
    });
    updateDraftForSelectedRole([...nextSet]);
  }

  async function handleSave() {
    if (!selectedRole) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const updatedRole = normalizeRole(
        await updateCompanyManagerRole(client, selectedRole.company_manager_role_id, {
          allowedNavKeys: selectedDraftAllowedNavKeys,
        }),
      );
      setRoles((current) =>
        current.map((role) =>
          role.company_manager_role_id === updatedRole.company_manager_role_id ? updatedRole : role,
        ),
      );
      setDraftAllowedNavKeysByRoleId((current) => ({
        ...current,
        [updatedRole.company_manager_role_id]: updatedRole.allowed_nav_keys,
      }));
      setStatusMessage(`${updatedRole.display_name} 메뉴 정책을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '메뉴 정책을 저장할 수 없습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleResetSelectedRole() {
    if (!selectedRole) {
      return;
    }
    updateDraftForSelectedRole(selectedRole.allowed_nav_keys);
    setErrorMessage(null);
    setStatusMessage(`${selectedRole.display_name} 정책을 저장된 상태로 되돌렸습니다.`);
  }

  const isLoading = isBootstrapping || isRolesLoading;

  return (
    <PageLayout
      contentClassName="stack policy-workbench-content"
      filters={
        <div className="policy-role-toolbar">
          <label className="field policy-role-field">
            <span>회사</span>
            <PolicyDropdown
              ariaLabel="회사"
              isOpen={openDropdown === 'company'}
              onClose={() => setOpenDropdown(null)}
              onSelect={setSelectedCompanyId}
              onToggle={() => setOpenDropdown((current) => (current === 'company' ? null : 'company'))}
              options={companyOptions}
              value={selectedCompanyId}
            />
          </label>
          <label className="field policy-role-field">
            <span>역할</span>
            <PolicyDropdown
              ariaLabel="역할"
              isOpen={openDropdown === 'role'}
              onClose={() => setOpenDropdown(null)}
              onSelect={setSelectedRoleId}
              onToggle={() => setOpenDropdown((current) => (current === 'role' ? null : 'role'))}
              options={roleOptions}
              value={selectedRoleId}
            />
          </label>
        </div>
      }
      layoutClassName="policy-workbench"
      subtitle="회사와 역할을 기준으로 사이드바 노출 정책을 조정합니다."
      template="workbench"
      title="메뉴 정책"
    >
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {statusMessage ? <p className="form-success">{statusMessage}</p> : null}

      <section className="panel policy-layout">
        <div className="policy-editor">
          <div className="policy-column-header">
            <h2>{selectedRole ? `${selectedRole.display_name} 편집` : '역할을 선택하세요'}</h2>
          </div>
          <div className="policy-toolbar">
            <div className="policy-summary-chips" aria-live="polite">
              <span className="policy-badge neutral">
                저장된 메뉴 {selectedRole?.allowed_nav_keys.length ?? 0}개
              </span>
              <span className="policy-badge success">현재 허용 {selectedDraftAllowedNavKeys.length}개</span>
              {selectedRole && isRoleDirty(selectedRole.company_manager_role_id) ? (
                <span className="policy-state-pill" data-policy-state="changed">
                  변경 중
                </span>
              ) : null}
            </div>
            {selectedRole && isRoleDirty(selectedRole.company_manager_role_id) ? (
              <div className="policy-toolbar-actions">
                <button
                  className="button ghost policy-action-button"
                  disabled={isLoading || isSaving}
                  onClick={handleResetSelectedRole}
                  type="button"
                >
                  취소
                </button>
                <button
                  className="button primary policy-action-button"
                  disabled={isLoading || isSaving}
                  onClick={() => void handleSave()}
                  type="button"
                >
                  {isSaving ? '저장 중...' : '저장'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="policy-group-stack policy-scroll-column">
            {selectedRole ? (
              SIDEBAR_WORKBENCH_SECTIONS.map((section) => {
                const sectionEditableKeys = section.items.filter((item) => item.editable).map((item) => item.key);
                const enabledCount = sectionEditableKeys.filter((key) => selectedDraftAllowedNavKeys.includes(key)).length;
                const allEnabled = sectionEditableKeys.length > 0 && enabledCount === sectionEditableKeys.length;
                const partiallyEnabled = enabledCount > 0 && !allEnabled;
                const isCollapsed = collapsedSections.includes(section.key);

                return (
                  <section className="policy-group-panel" key={section.key}>
                    <div className="policy-group-header">
                      <button
                        className="policy-group-toggle"
                        onClick={() => toggleSectionCollapsed(section.key)}
                        type="button"
                      >
                        <h3>{section.label}</h3>
                        <span>{isCollapsed ? '펼치기' : '접기'}</span>
                      </button>
                      <label className="policy-group-check">
                        <input
                          checked={allEnabled}
                          disabled={sectionEditableKeys.length === 0 || isLoading || isSaving}
                          onChange={(event) => toggleSectionKeys(section, event.target.checked)}
                          ref={(node) => {
                            if (node) {
                              node.indeterminate = partiallyEnabled;
                            }
                          }}
                          type="checkbox"
                        />
                        <span>전체 허용</span>
                      </label>
                    </div>
                    {!isCollapsed ? (
                      <div className="policy-item-grid">
                        {section.items.map((item) => {
                          const checked = selectedDraftAllowedNavKeys.includes(item.key);
                          const persisted = selectedRole.allowed_nav_keys.includes(item.key);
                          const changed = item.editable ? checked !== persisted : false;
                          return (
                            <label className={`policy-item-card${checked ? ' is-enabled' : ''}`} key={item.key}>
                              <div className="policy-item-main">
                                <div className="policy-item-header">
                                  <div>
                                    <strong>{item.label}</strong>
                                    <code>{item.key}</code>
                                  </div>
                                  <div className="policy-item-badges">
                                    {item.editable ? (
                                      <>
                                        <span className="policy-state-pill" data-policy-state={checked ? 'allow' : 'deny'}>
                                          {checked ? '허용' : '금지'}
                                        </span>
                                        {changed ? (
                                          <span className="policy-state-pill" data-policy-state="changed">
                                            변경 예정
                                          </span>
                                        ) : null}
                                      </>
                                    ) : (
                                      <span className="policy-state-pill" data-policy-state="locked">
                                        설정 불가
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <input
                                aria-label={item.label}
                                checked={checked}
                                disabled={!item.editable || isLoading || isSaving}
                                onChange={() => toggleNavKey(item.key)}
                                type="checkbox"
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })
            ) : (
              <div className="panel-empty-state">선택 가능한 역할이 없습니다.</div>
            )}
          </div>
        </div>

        <aside className="policy-preview-panel" data-testid="navigation-policy-preview">
          <div className="policy-column-header">
            <h2>사이드바 미리보기</h2>
          </div>
          <div className="policy-preview-shell policy-scroll-column">
            {selectedRole ? (
              SIDEBAR_WORKBENCH_SECTIONS.map((section) => (
                <section className="policy-preview-group" key={section.key}>
                  <strong>{section.label}</strong>
                  <div className="policy-preview-items">
                    {section.items.map((item) => {
                      const checked = selectedDraftAllowedNavKeys.includes(item.key);
                      const stateLabel = !item.editable ? '설정 불가' : checked ? '허용' : '금지';
                      const stateClass = !item.editable ? 'is-locked' : checked ? 'is-visible' : 'is-hidden';
                      return (
                        <div
                          className={`policy-preview-item ${stateClass}`}
                          data-policy-state={!item.editable ? 'locked' : checked ? 'allow' : 'deny'}
                          key={item.key}
                        >
                          <span>{item.label}</span>
                          <span className="policy-state-pill" data-policy-state={!item.editable ? 'locked' : checked ? 'allow' : 'deny'}>
                            {stateLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="panel-empty-state">선택 가능한 역할이 없습니다.</div>
            )}
          </div>
        </aside>
      </section>
    </PageLayout>
  );
}
