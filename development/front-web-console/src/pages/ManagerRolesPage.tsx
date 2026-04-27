import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createCompanyManagerRole,
  deleteCompanyManagerRole,
  listCompanyManagerRoles,
  reorderCompanyManagerRoles,
  updateCompanyManagerRole,
} from '../api/managerRoles';
import type { HttpClient, SessionPayload } from '../api/http';
import { getErrorMessage } from '../api/http';
import { PageLayout } from '../components/PageLayout';
import type { TopNotificationTone } from '../components/TopNotificationBar';
import { listCompanies } from '../api/organization';
import type { Company, CompanyManagerRole } from '../types';

type EditableRole = CompanyManagerRole & {
  draftCode: string;
  draftDisplayName: string;
  draftScopeLevel: CompanyManagerRole['scope_level'];
  isEditing?: boolean;
  isNew?: boolean;
};

type RoleListItem =
  | { kind: 'role'; role: EditableRole }
  | {
      kind: 'placeholder';
      sourceRoleId: string;
      targetRoleId: string;
      label: string;
      ariaLabel: string;
      isEnd?: boolean;
    };

const ROLE_DROP_END = '__role-drop-end__';

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps = {
  ariaLabel: string;
  disabled?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  onToggle: () => void;
  options: DropdownOption[];
  value: string;
};

function RoleDropdown({
  ariaLabel,
  disabled = false,
  isOpen,
  onClose,
  onSelect,
  onToggle,
  options,
  value,
}: DropdownProps) {
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

  const selected = options.find((option) => option.value === value);

  return (
    <div className="policy-dropdown" ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="policy-dropdown-trigger"
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        <span className="policy-dropdown-trigger-label">{selected?.label ?? `${ariaLabel} 없음`}</span>
      </button>
      {isOpen && !disabled ? (
        <div aria-label={ariaLabel} className="policy-dropdown-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                aria-label={option.label}
                aria-selected={isSelected}
                className={`policy-dropdown-option${isSelected ? ' is-selected' : ''}`}
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  onClose();
                }}
                role="option"
                type="button"
              >
                <span className="policy-dropdown-option-label">{option.label}</span>
                {isSelected ? <small>선택됨</small> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function toEditableRole(role: CompanyManagerRole): EditableRole {
  return {
    ...role,
    draftCode: role.code,
    draftDisplayName: role.display_name,
    draftScopeLevel: role.scope_level,
    isEditing: false,
  };
}

function canEditCustomRoleCode(role: EditableRole) {
  return !role.isNew && !role.is_system_required && !role.is_default && role.assigned_count === 0;
}

function reorderEditableRoles(current: EditableRole[], sourceRoleId: string, targetRoleId: string) {
  const sourceIndex = current.findIndex((role) => role.company_manager_role_id === sourceRoleId);
  if (sourceIndex === -1) {
    return current;
  }

  if (targetRoleId === ROLE_DROP_END) {
    if (sourceIndex === current.length - 1) {
      return current;
    }

    const next = [...current];
    const [moved] = next.splice(sourceIndex, 1);
    next.push(moved);
    return next;
  }

  const targetIndex = current.findIndex((role) => role.company_manager_role_id === targetRoleId);
  if (targetIndex === -1 || sourceIndex === targetIndex) {
    return current;
  }

  const next = [...current];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function buildRoleListItems(
  roles: EditableRole[],
  draggingRoleId: string | null,
  dropRoleId: string | null,
): RoleListItem[] {
  if (!draggingRoleId) {
    return roles.map((role) => ({ kind: 'role', role }));
  }

  const draggingRole = roles.find((role) => role.company_manager_role_id === draggingRoleId);
  const remainingRoles = roles.filter((role) => role.company_manager_role_id !== draggingRoleId);
  if (!draggingRole) {
    return roles.map((role) => ({ kind: 'role', role }));
  }

  const items = remainingRoles.map((role) => ({ kind: 'role', role }) as RoleListItem);
  if (!dropRoleId) {
    return items;
  }

  const placeholderIndex = remainingRoles.findIndex(
    (role) => role.company_manager_role_id === dropRoleId,
  );
  if (dropRoleId !== ROLE_DROP_END) {
    const placeholder: RoleListItem = {
      kind: 'placeholder',
      sourceRoleId: draggingRoleId,
      targetRoleId: dropRoleId,
      label: draggingRole.display_name || draggingRole.draftDisplayName || '이동할 역할',
      ariaLabel: `${draggingRole.display_name || draggingRole.draftDisplayName || '이동할 역할'} 이동 자리`,
    };

    if (placeholderIndex === -1) {
      items.push(placeholder);
    } else {
      items.splice(placeholderIndex, 0, placeholder);
    }
  }

  items.push({
    kind: 'placeholder',
    sourceRoleId: draggingRoleId,
    targetRoleId: ROLE_DROP_END,
    label: '맨 아래로 이동',
    ariaLabel: '역할 목록 맨 아래 이동 자리',
    isEnd: true,
  });
  return items;
}

function getNextRoleLabel(roles: CompanyManagerRole[]) {
  const nextIndex =
    roles
      .filter((role) => role.code.startsWith('custom_role_'))
      .map((role) => Number(role.code.replace('custom_role_', '')))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0) + 1;
  return `새 관리자 역할 ${nextIndex}`;
}

type Props = {
  client: HttpClient;
  onShowNotice?: (message: string, tone: TopNotificationTone) => void;
  session: SessionPayload;
};

const ROLE_SCOPE_OPTIONS: DropdownOption[] = [
  { value: 'company', label: '회사 역할' },
  { value: 'fleet', label: '플릿 역할' },
];

function getRoleScopeLabel(scopeLevel: CompanyManagerRole['scope_level']) {
  return ROLE_SCOPE_OPTIONS.find((option) => option.value === scopeLevel)?.label ?? '회사 역할';
}

export function ManagerRolesPage({ client, onShowNotice, session }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [roles, setRoles] = useState<EditableRole[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [draggingRoleId, setDraggingRoleId] = useState<string | null>(null);
  const [dropRoleId, setDropRoleId] = useState<string | null>(null);
  const dragPreviewRef = useRef<HTMLElement | null>(null);
  const dragSourceRoleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!errorMessage || !onShowNotice) {
      return;
    }

    onShowNotice(errorMessage, 'error');
    setErrorMessage(null);
  }, [errorMessage, onShowNotice]);

  useEffect(() => {
    if (!statusMessage || !onShowNotice) {
      return;
    }

    onShowNotice(statusMessage, 'success');
    setStatusMessage(null);
  }, [onShowNotice, statusMessage]);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    setErrorMessage(null);

    void listCompanies(client)
      .then((companyList) => {
        if (ignore) {
          return;
        }

        const activeCompanyId = session.activeAccount?.companyId ?? null;
        const resolvedCompanies =
          companyList.length > 0
            ? companyList
            : activeCompanyId
              ? [{ company_id: activeCompanyId, name: '현재 회사' }]
              : [];

        setCompanies(resolvedCompanies);
        if (session.activeAccount?.accountType === 'manager' && activeCompanyId) {
          setSelectedCompanyId(activeCompanyId);
          return;
        }
        setSelectedCompanyId(resolvedCompanies[0]?.company_id ?? '');
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error, '관리자 역할 목록을 불러올 수 없습니다.'));
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
  }, [client, session.activeAccount]);

  useEffect(() => {
    let ignore = false;
    if (!selectedCompanyId) {
      setRoles([]);
      return undefined;
    }

    setIsLoading(true);
    setErrorMessage(null);
    void listCompanyManagerRoles(client, selectedCompanyId)
      .then((response) => {
        if (!ignore) {
          setRoles(response.roles.map(toEditableRole));
        }
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error, '관리자 역할 목록을 불러올 수 없습니다.'));
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
  }, [client, selectedCompanyId]);

  const companyOptions = useMemo(
    () => companies.map((company) => ({ value: company.company_id, label: company.name })),
    [companies],
  );
  const roleListItems = useMemo(
    () => buildRoleListItems(roles, draggingRoleId, dropRoleId),
    [dropRoleId, draggingRoleId, roles],
  );

  const isCompanyFixed = session.activeAccount?.accountType === 'manager';
  const isReorderLocked = isMutating || roles.some((role) => role.isEditing);

  function clearDragPreview() {
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
  }

  function resetDragState() {
    dragSourceRoleIdRef.current = null;
    setDraggingRoleId(null);
    setDropRoleId(null);
    clearDragPreview();
  }

  useEffect(() => {
    if (!dragSourceRoleIdRef.current && !draggingRoleId) {
      clearDragPreview();
      return undefined;
    }

    function handleWindowDragEnd() {
      resetDragState();
    }

    window.addEventListener('dragend', handleWindowDragEnd, true);
    window.addEventListener('drop', handleWindowDragEnd, true);
    window.addEventListener('mouseup', handleWindowDragEnd, true);
    window.addEventListener('pointerup', handleWindowDragEnd, true);
    document.addEventListener('dragend', handleWindowDragEnd, true);
    document.addEventListener('drop', handleWindowDragEnd, true);
    return () => {
      window.removeEventListener('dragend', handleWindowDragEnd, true);
      window.removeEventListener('drop', handleWindowDragEnd, true);
      window.removeEventListener('mouseup', handleWindowDragEnd, true);
      window.removeEventListener('pointerup', handleWindowDragEnd, true);
      document.removeEventListener('dragend', handleWindowDragEnd, true);
      document.removeEventListener('drop', handleWindowDragEnd, true);
      clearDragPreview();
    };
  }, [draggingRoleId]);

  function updateRoleDraft(roleId: string, draftDisplayName: string) {
    setRoles((current) =>
      current.map((role) =>
        role.company_manager_role_id === roleId ? { ...role, draftDisplayName } : role,
      ),
    );
  }

  function updateRoleCode(roleId: string, draftCode: string) {
    setRoles((current) =>
      current.map((role) =>
        role.company_manager_role_id === roleId ? { ...role, draftCode } : role,
      ),
    );
  }

  function updateRoleScope(roleId: string, draftScopeLevel: CompanyManagerRole['scope_level']) {
    setRoles((current) =>
      current.map((role) =>
        role.company_manager_role_id === roleId ? { ...role, draftScopeLevel } : role,
      ),
    );
  }

  function startEditRole(roleId: string) {
    setRoles((current) =>
      current.map((role) =>
        role.company_manager_role_id === roleId ? { ...role, isEditing: true } : role,
      ),
    );
  }

  function cancelEditRole(role: EditableRole) {
    setOpenDropdown(null);
    if (role.isNew) {
      setRoles((current) =>
        current.filter((item) => item.company_manager_role_id !== role.company_manager_role_id),
      );
      setStatusMessage('새 역할 초안을 취소했습니다.');
      return;
    }

    setRoles((current) =>
      current.map((item) =>
        item.company_manager_role_id === role.company_manager_role_id
          ? {
              ...item,
              draftDisplayName: item.display_name,
              draftScopeLevel: item.scope_level,
              isEditing: false,
            }
          : item,
      ),
    );
  }

  async function handleAddRole() {
    if (!selectedCompanyId) {
      return;
    }

    const tempRoleId = `draft-${Date.now()}`;
    setRoles((current) => [
      ...current,
      {
        company_manager_role_id: tempRoleId,
        company_id: selectedCompanyId,
        code: '저장 후 코드 생성',
        display_name: '',
        display_order: current.length + 1,
        draftCode: '',
        draftDisplayName: getNextRoleLabel(current),
        scope_level: 'company',
        draftScopeLevel: 'company',
        isEditing: true,
        is_system_required: false,
        is_default: false,
        allowed_nav_keys: [],
        assigned_count: 0,
        can_delete: true,
        delete_block_reason: null,
        isNew: true,
      },
    ]);
    setStatusMessage('새 역할 초안을 목록에 추가했습니다. 이름과 적용 대상을 정한 뒤 저장하십시오.');
  }

  async function handleSaveRole(role: EditableRole) {
    const isCodeEditable = canEditCustomRoleCode(role);
    const nextCode = role.draftCode.trim();
    const nextName = role.draftDisplayName.trim();
    const hasCodeChange = isCodeEditable && nextCode !== role.code;
    const hasNameChange = nextName !== role.display_name;
    const hasScopeChange = role.draftScopeLevel !== role.scope_level;
    if (!nextName || (isCodeEditable && !nextCode)) {
      return;
    }

    if (!role.isNew && !hasCodeChange && !hasNameChange && !hasScopeChange) {
      cancelEditRole(role);
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    try {
      const updated = role.isNew
        ? await createCompanyManagerRole(client, {
            companyId: selectedCompanyId,
            displayName: nextName,
            scopeLevel: role.draftScopeLevel,
          })
        : await updateCompanyManagerRole(client, role.company_manager_role_id, {
            ...(hasCodeChange ? { code: nextCode } : {}),
            ...(hasNameChange ? { displayName: nextName } : {}),
            ...(hasScopeChange ? { scopeLevel: role.draftScopeLevel } : {}),
          });
      setRoles((current) =>
        current.map((item) =>
          item.company_manager_role_id === role.company_manager_role_id
            ? toEditableRole(updated)
            : item,
        ),
      );
      setOpenDropdown(null);
      setStatusMessage(
        role.isNew
          ? `${updated.display_name} 역할을 추가했습니다.`
          : `${updated.display_name} 역할 설정을 저장했습니다.`,
      );
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, role.isNew ? '관리자 역할을 추가할 수 없습니다.' : '관리자 역할 설정을 저장할 수 없습니다.'),
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDeleteRole(role: EditableRole) {
    if (role.isNew) {
      cancelEditRole(role);
      return;
    }

    if (!role.can_delete) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    try {
      await deleteCompanyManagerRole(client, role.company_manager_role_id);
      setRoles((current) =>
        current.filter((item) => item.company_manager_role_id !== role.company_manager_role_id),
      );
      setStatusMessage(`${role.display_name} 역할을 삭제했습니다.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '관리자 역할을 삭제할 수 없습니다.'));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleDropRole(targetRoleId: string) {
    const activeDraggingRoleId = draggingRoleId ?? dragSourceRoleIdRef.current;
    if (!selectedCompanyId || !activeDraggingRoleId || activeDraggingRoleId === targetRoleId) {
      resetDragState();
      return;
    }

    const previousRoles = roles;
    const nextRoles = reorderEditableRoles(previousRoles, activeDraggingRoleId, targetRoleId);
    if (nextRoles === previousRoles) {
      resetDragState();
      return;
    }

    setRoles(nextRoles);
    resetDragState();
    setIsMutating(true);
    setErrorMessage(null);

    try {
      const response = await reorderCompanyManagerRoles(client, {
        companyId: selectedCompanyId,
        roleIds: nextRoles
          .filter((item) => !item.isNew)
          .map((item) => item.company_manager_role_id),
      });
      const draftRoles = previousRoles.filter((item) => item.isNew);
      setRoles([...response.roles.map(toEditableRole), ...draftRoles]);
      setStatusMessage('역할 순서를 저장했습니다.');
    } catch (error) {
      setRoles(previousRoles);
      setErrorMessage(getErrorMessage(error, '관리자 역할 순서를 저장할 수 없습니다.'));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <PageLayout
      actions={
        <button
          className="button primary"
          disabled={!selectedCompanyId || isLoading || isMutating}
          onClick={() => void handleAddRole()}
          type="button"
        >
          역할 추가
        </button>
      }
      contentClassName="stack role-catalog-content"
      fillContent
      filters={
        <>
          <label className="field">
            <span>회사</span>
            <RoleDropdown
              ariaLabel="회사"
              disabled={isCompanyFixed || companyOptions.length === 0}
              isOpen={openDropdown === 'company'}
              onClose={() => setOpenDropdown(null)}
              onSelect={(value) => {
                setSelectedCompanyId(value);
                setStatusMessage(null);
              }}
              onToggle={() => setOpenDropdown((current) => (current === 'company' ? null : 'company'))}
              options={companyOptions}
              value={selectedCompanyId}
            />
          </label>
        </>
      }
      layoutClassName="role-catalog-page"
      subtitle="회사별 관리자 역할과 배정 상태를 같은 흐름에서 관리합니다."
      template="workbench"
      title="관리자 역할"
    >
      {!onShowNotice && errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {!onShowNotice && statusMessage ? <div className="success-banner">{statusMessage}</div> : null}

      <section className="panel role-catalog-panel">
        <div className="panel-header">
          <div className="stack compact">
            <h2>역할 목록</h2>
            <p className="panel-copy">
              역할에서는 회사 대상인지 플릿 대상인지만 정합니다. 플릿 대상 역할의 실제 담당 플릿은 계정 요청 처리에서 배정합니다.
            </p>
          </div>
        </div>

        <div className="role-catalog-list">
          {roleListItems.map((item) => {
            if (item.kind === 'placeholder') {
              return (
                <article
                  aria-label={item.ariaLabel}
                  className={`role-card role-card-placeholder${item.isEnd ? ' is-end-placeholder' : ''}${dropRoleId === item.targetRoleId ? ' is-drop-target' : ''}`}
                  data-placeholder-for={item.sourceRoleId}
                  key={`placeholder:${item.sourceRoleId}:${item.targetRoleId}`}
                  onDragOver={(event) => {
                    const activeDraggingRoleId = draggingRoleId ?? dragSourceRoleIdRef.current;
                    if (!activeDraggingRoleId) {
                      return;
                    }
                    event.preventDefault();
                    setDropRoleId(item.targetRoleId);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleDropRole(item.targetRoleId);
                  }}
                >
                  <div aria-hidden="true" className="role-drag-handle-spacer" />
                  <div className="role-card-placeholder-copy">
                    <strong>{item.label}</strong>
                    <span>여기에 배치</span>
                  </div>
                </article>
              );
            }

            const { role } = item;
            const roleActionLabel = role.draftDisplayName.trim() || role.display_name || '새 역할';
            const scopeDropdownKey = `scope:${role.company_manager_role_id}`;
            const isCodeEditable = canEditCustomRoleCode(role);
            return (
              <article
                className={`role-card${role.isEditing ? ' is-editing' : ' is-readonly'}${dropRoleId === role.company_manager_role_id ? ' is-drop-target' : ''}${draggingRoleId === role.company_manager_role_id ? ' is-dragging' : ''}`}
                data-role-id={role.company_manager_role_id}
                key={role.company_manager_role_id}
                onDragOver={(event) => {
                  const activeDraggingRoleId = draggingRoleId ?? dragSourceRoleIdRef.current;
                  if (isReorderLocked || role.isEditing || role.isNew || !activeDraggingRoleId) {
                    return;
                  }
                  event.preventDefault();
                  if (!draggingRoleId) {
                    setDraggingRoleId(activeDraggingRoleId);
                  }
                  setDropRoleId(role.company_manager_role_id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleDropRole(role.company_manager_role_id);
                }}
              >
                {!role.isEditing ? (
                  <button
                    aria-label={`${role.display_name || roleActionLabel} 순서 이동`}
                    className="role-drag-handle"
                    disabled={isReorderLocked || role.isNew}
                    draggable={!isReorderLocked && !role.isNew}
                    onDragEnd={() => {
                      resetDragState();
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', role.company_manager_role_id);
                      dragSourceRoleIdRef.current = role.company_manager_role_id;
                      const cardElement = event.currentTarget.closest('.role-card');
                      if (cardElement instanceof HTMLElement) {
                        const previewElement = cardElement.cloneNode(true) as HTMLElement;
                        previewElement.classList.add('role-card-drag-preview');
                        previewElement.setAttribute('aria-hidden', 'true');
                        previewElement.style.width = `${cardElement.getBoundingClientRect().width}px`;
                        previewElement.style.left = '-9999px';
                        previewElement.style.top = '-9999px';
                        document.body.appendChild(previewElement);
                        dragPreviewRef.current = previewElement;
                        event.dataTransfer.setDragImage(previewElement, 36, 24);
                      }
                      setDropRoleId(null);
                    }}
                    type="button"
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                ) : (
                  <div aria-hidden="true" className="role-drag-handle-spacer" />
                )}
                <div className="role-card-main">
                  <div className="role-card-heading">
                    <div className="role-card-title-row">
                      <strong className="role-card-title">{role.display_name || roleActionLabel}</strong>
                      <code className="role-card-code-inline">{role.isNew ? '저장 후 코드 생성' : role.code}</code>
                    </div>
                  </div>
                </div>
                <div className="role-card-actions">
                  {!role.isEditing ? (
                    <span
                      className={`role-scope-badge${role.draftScopeLevel === 'fleet' ? ' is-fleet' : ''}`}
                    >
                      {getRoleScopeLabel(role.draftScopeLevel)}
                    </span>
                  ) : null}
                  {!role.isEditing ? (
                    <span className="role-count-badge">배정 {role.assigned_count}명</span>
                  ) : null}
                  {!role.isEditing && role.is_system_required ? (
                    <span className="policy-badge warning">필수</span>
                  ) : null}
                  {!role.isEditing && role.is_default ? (
                    <span className="policy-badge neutral">기본</span>
                  ) : null}
                  {role.isEditing ? (
                    <button
                      aria-label={`${roleActionLabel} 저장`}
                      className="button secondary"
                      disabled={isMutating || role.draftDisplayName.trim() === '' || (isCodeEditable && role.draftCode.trim() === '')}
                      onClick={() => void handleSaveRole(role)}
                      type="button"
                    >
                      저장
                    </button>
                  ) : (
                    <button
                      aria-label={`${roleActionLabel} 수정`}
                      className="button secondary"
                      disabled={isMutating}
                      onClick={() => startEditRole(role.company_manager_role_id)}
                      type="button"
                    >
                      수정
                    </button>
                  )}
                  <button
                    aria-label={`${roleActionLabel} ${role.isEditing || role.isNew ? '취소' : '삭제'}`}
                    className="button ghost"
                    disabled={role.isEditing || role.isNew ? isMutating : isMutating || !role.can_delete}
                    onClick={() =>
                      role.isEditing || role.isNew
                        ? cancelEditRole(role)
                        : void handleDeleteRole(role)
                    }
                    type="button"
                  >
                    {role.isEditing || role.isNew ? '취소' : '삭제'}
                  </button>
                </div>
                {role.isEditing ? (
                  <div className="role-card-editor">
                    <div className="field role-card-editor-name">
                      <span>역할 이름</span>
                      <input
                        aria-label={`${roleActionLabel} 이름`}
                        className="role-card-name-input"
                        onChange={(event) =>
                          updateRoleDraft(role.company_manager_role_id, event.target.value)
                        }
                        placeholder="역할 이름"
                        type="text"
                        value={role.draftDisplayName}
                      />
                    </div>
                    {isCodeEditable ? (
                      <div className="field role-card-code-field">
                        <span>영문 변수명</span>
                        <input
                          aria-label={`${roleActionLabel} 영문 변수명`}
                          className="role-card-code-input"
                          onChange={(event) =>
                            updateRoleCode(role.company_manager_role_id, event.target.value)
                          }
                          placeholder="dispatch_quality_manager"
                          type="text"
                          value={role.draftCode}
                        />
                      </div>
                    ) : null}
                    <div className="field role-card-scope-field">
                      <span>{`${roleActionLabel} 적용 대상`}</span>
                      <RoleDropdown
                        ariaLabel={`${roleActionLabel} 적용 대상`}
                        disabled={isMutating || role.assigned_count > 0 || role.is_system_required}
                        isOpen={openDropdown === scopeDropdownKey}
                        onClose={() => setOpenDropdown(null)}
                        onSelect={(value) =>
                          updateRoleScope(
                            role.company_manager_role_id,
                            value as CompanyManagerRole['scope_level'],
                          )
                        }
                        onToggle={() =>
                          setOpenDropdown((current) =>
                            current === scopeDropdownKey ? null : scopeDropdownKey,
                          )
                        }
                        options={ROLE_SCOPE_OPTIONS}
                        value={role.draftScopeLevel}
                      />
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
}
