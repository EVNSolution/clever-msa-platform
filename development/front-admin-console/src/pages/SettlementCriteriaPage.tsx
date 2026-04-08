import { useEffect, useState, type FormEvent } from 'react';

import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { FormModal } from '../components/FormModal';
import {
  createSettlementPolicy,
  createSettlementPolicyAssignment,
  createSettlementPolicyVersion,
  deleteSettlementPolicy,
  deleteSettlementPolicyAssignment,
  deleteSettlementPolicyVersion,
  listSettlementPolicies,
  listSettlementPolicyAssignments,
  listSettlementPolicyVersions,
  updateSettlementPolicy,
  updateSettlementPolicyAssignment,
  updateSettlementPolicyVersion,
  type SettlementPolicyAssignmentPayload,
  type SettlementPolicyPayload,
  type SettlementPolicyVersionPayload,
} from '../api/settlementRegistry';
import type {
  Company,
  Fleet,
  SettlementPolicy,
  SettlementPolicyAssignment,
  SettlementPolicyVersion,
} from '../types';
import {
  formatPolicyStatusLabel,
  formatPolicyVersionStatusLabel,
} from '../uiLabels';
import {
  getCompanyName,
  getFleetName,
  getFleetOptions,
  parseJsonInput,
  stringifyJson,
} from './settlementAdminHelpers';

type SettlementCriteriaPageProps = {
  client: HttpClient;
};

const DEFAULT_POLICY_FORM: SettlementPolicyPayload = {
  policy_code: '',
  name: '',
  status: 'active',
  description: '',
};

const DEFAULT_VERSION_FORM = {
  policy_id: '',
  version_number: '1',
  rule_payload_text: '{\n  "base_amount_per_delivery": 0\n}',
  status: 'draft',
  published_at: '',
};

const DEFAULT_ASSIGNMENT_FORM = {
  policy_version_id: '',
  company_id: '',
  fleet_id: '',
  effective_start_date: '2026-03-01',
  effective_end_date: '',
  status: 'active',
};

export function SettlementCriteriaPage({ client }: SettlementCriteriaPageProps) {
  const [policies, setPolicies] = useState<SettlementPolicy[]>([]);
  const [versions, setVersions] = useState<SettlementPolicyVersion[]>([]);
  const [assignments, setAssignments] = useState<SettlementPolicyAssignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [policyForm, setPolicyForm] = useState<SettlementPolicyPayload>(DEFAULT_POLICY_FORM);
  const [versionForm, setVersionForm] = useState(DEFAULT_VERSION_FORM);
  const [assignmentForm, setAssignmentForm] = useState(DEFAULT_ASSIGNMENT_FORM);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadAll() {
    const [policyResponse, versionResponse, assignmentResponse, companyResponse, fleetResponse] =
      await Promise.all([
        listSettlementPolicies(client),
        listSettlementPolicyVersions(client),
        listSettlementPolicyAssignments(client),
        listCompanies(client),
        listFleets(client),
      ]);

    setPolicies(policyResponse);
    setVersions(versionResponse);
    setAssignments(assignmentResponse);
    setCompanies(companyResponse);
    setFleets(fleetResponse);

    setVersionForm((current) => ({
      ...current,
      policy_id: current.policy_id || policyResponse[0]?.policy_id || '',
    }));

    setAssignmentForm((current) => {
      const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
      const fleetOptions = getFleetOptions(fleetResponse, nextCompanyId);
      return {
        ...current,
        policy_version_id: current.policy_version_id || versionResponse[0]?.policy_version_id || '',
        company_id: nextCompanyId,
        fleet_id:
          fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
          fleetOptions[0]?.fleet_id ??
          fleetResponse[0]?.fleet_id ??
          '',
      };
    });
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [policyResponse, versionResponse, assignmentResponse, companyResponse, fleetResponse] =
          await Promise.all([
            listSettlementPolicies(client),
            listSettlementPolicyVersions(client),
            listSettlementPolicyAssignments(client),
            listCompanies(client),
            listFleets(client),
          ]);

        if (ignore) {
          return;
        }

        setPolicies(policyResponse);
        setVersions(versionResponse);
        setAssignments(assignmentResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setVersionForm((current) => ({
          ...current,
          policy_id: current.policy_id || policyResponse[0]?.policy_id || '',
        }));
        setAssignmentForm((current) => {
          const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
          const fleetOptions = getFleetOptions(fleetResponse, nextCompanyId);
          return {
            ...current,
            policy_version_id: current.policy_version_id || versionResponse[0]?.policy_version_id || '',
            company_id: nextCompanyId,
            fleet_id:
              fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
              fleetOptions[0]?.fleet_id ??
              fleetResponse[0]?.fleet_id ??
              '',
          };
        });
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client]);

  function resetPolicyForm() {
    setEditingPolicyId(null);
    setPolicyForm(DEFAULT_POLICY_FORM);
  }

  function resetVersionForm() {
    setEditingVersionId(null);
    setVersionForm({
      ...DEFAULT_VERSION_FORM,
      policy_id: policies[0]?.policy_id ?? '',
    });
  }

  function resetAssignmentForm() {
    const companyId = companies[0]?.company_id ?? '';
    setEditingAssignmentId(null);
    setAssignmentForm({
      ...DEFAULT_ASSIGNMENT_FORM,
      policy_version_id: versions[0]?.policy_version_id ?? '',
      company_id: companyId,
      fleet_id: getFleetOptions(fleets, companyId)[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '',
    });
  }

  function handleAssignmentCompanyChange(companyId: string) {
    setAssignmentForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id:
        getFleetOptions(fleets, companyId).find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
        getFleetOptions(fleets, companyId)[0]?.fleet_id ??
        '',
    }));
  }

  async function handlePolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingPolicyId) {
        await updateSettlementPolicy(client, editingPolicyId, policyForm);
      } else {
        await createSettlementPolicy(client, policyForm);
      }
      await loadAll();
      setIsPolicyModalOpen(false);
      resetPolicyForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleVersionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload: SettlementPolicyVersionPayload = {
        policy_id: versionForm.policy_id,
        version_number: Number.parseInt(versionForm.version_number, 10),
        rule_payload: parseJsonInput(versionForm.rule_payload_text),
        status: versionForm.status,
        published_at: versionForm.published_at || null,
      };

      if (editingVersionId) {
        await updateSettlementPolicyVersion(client, editingVersionId, payload);
      } else {
        await createSettlementPolicyVersion(client, payload);
      }
      await loadAll();
      setIsVersionModalOpen(false);
      resetVersionForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleAssignmentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload: SettlementPolicyAssignmentPayload = {
        policy_version_id: assignmentForm.policy_version_id,
        company_id: assignmentForm.company_id,
        fleet_id: assignmentForm.fleet_id,
        effective_start_date: assignmentForm.effective_start_date,
        effective_end_date: assignmentForm.effective_end_date || null,
        status: assignmentForm.status,
      };

      if (editingAssignmentId) {
        await updateSettlementPolicyAssignment(client, editingAssignmentId, payload);
      } else {
        await createSettlementPolicyAssignment(client, payload);
      }
      await loadAll();
      setIsAssignmentModalOpen(false);
      resetAssignmentForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handlePolicyDelete(policyId: string) {
    setErrorMessage(null);
    try {
      await deleteSettlementPolicy(client, policyId);
      await loadAll();
      if (editingPolicyId === policyId) {
        setIsPolicyModalOpen(false);
        resetPolicyForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleVersionDelete(policyVersionId: string) {
    setErrorMessage(null);
    try {
      await deleteSettlementPolicyVersion(client, policyVersionId);
      await loadAll();
      if (editingVersionId === policyVersionId) {
        setIsVersionModalOpen(false);
        resetVersionForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleAssignmentDelete(assignmentId: string) {
    setErrorMessage(null);
    try {
      await deleteSettlementPolicyAssignment(client, assignmentId);
      await loadAll();
      if (editingAssignmentId === assignmentId) {
        setIsAssignmentModalOpen(false);
        resetAssignmentForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function selectPolicy(policy: SettlementPolicy) {
    setEditingPolicyId(policy.policy_id);
    setPolicyForm({
      policy_code: policy.policy_code,
      name: policy.name,
      status: policy.status,
      description: policy.description,
    });
    setIsPolicyModalOpen(true);
  }

  function selectVersion(version: SettlementPolicyVersion) {
    setEditingVersionId(version.policy_version_id);
    setVersionForm({
      policy_id: version.policy_id,
      version_number: String(version.version_number),
      rule_payload_text: stringifyJson(version.rule_payload),
      status: version.status,
      published_at: version.published_at ?? '',
    });
    setIsVersionModalOpen(true);
  }

  function selectAssignment(assignment: SettlementPolicyAssignment) {
    setEditingAssignmentId(assignment.assignment_id);
    setAssignmentForm({
      policy_version_id: assignment.policy_version_id,
      company_id: assignment.company_id,
      fleet_id: assignment.fleet_id,
      effective_start_date: assignment.effective_start_date,
      effective_end_date: assignment.effective_end_date ?? '',
      status: assignment.status,
    });
    setIsAssignmentModalOpen(true);
  }

  function openCreatePolicyModal() {
    resetPolicyForm();
    setIsPolicyModalOpen(true);
  }

  function closePolicyModal() {
    setIsPolicyModalOpen(false);
    resetPolicyForm();
  }

  function openCreateVersionModal() {
    resetVersionForm();
    setIsVersionModalOpen(true);
  }

  function closeVersionModal() {
    setIsVersionModalOpen(false);
    resetVersionForm();
  }

  function openCreateAssignmentModal() {
    resetAssignmentForm();
    setIsAssignmentModalOpen(true);
  }

  function closeAssignmentModal() {
    setIsAssignmentModalOpen(false);
    resetAssignmentForm();
  }

  function handlePolicyRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, policy: SettlementPolicy) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectPolicy(policy);
  }

  function handleVersionRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    version: SettlementPolicyVersion,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectVersion(version);
  }

  function handleAssignmentRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    assignment: SettlementPolicyAssignment,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectAssignment(assignment);
  }

  function getPolicyName(policyId: string) {
    return policies.find((policy) => policy.policy_id === policyId)?.name ?? '미확인 정책';
  }

  function getVersionLabel(versionId: string) {
    const version = versions.find((entry) => entry.policy_version_id === versionId);
    if (!version) {
      return '미확인 버전';
    }
    return `${getPolicyName(version.policy_id)} v${version.version_number}`;
  }

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 기준 운영</p>
          <h2>정책 요약</h2>
          <p className="empty-state">정책, 버전, 회사 연결을 한 흐름에서 유지합니다.</p>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 기준을 불러오는 중입니다...</p>
        ) : (
          <div className="summary-strip">
            <article className="summary-item">
              <span>Policy</span>
              <strong>{policies.length}</strong>
              <small>등록된 정산 정책 수</small>
            </article>
            <article className="summary-item">
              <span>Version</span>
              <strong>{versions.length}</strong>
              <small>등록된 정책 버전 수</small>
            </article>
            <article className="summary-item">
              <span>Assignment</span>
              <strong>{assignments.length}</strong>
              <small>회사/플릿 연결 수</small>
            </article>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">Policy List</p>
            <h2>정책 목록</h2>
          </div>
          <button className="button primary" onClick={openCreatePolicyModal} type="button">
            정책 생성
          </button>
        </div>
        {isLoading ? (
          <p className="empty-state">정책을 불러오는 중입니다...</p>
        ) : policies.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">정책 코어와 활성 상태를 먼저 고정하고, 세부 규칙은 버전에서 관리합니다.</span>
              <span className="table-meta">총 {policies.length}개 정책</span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>코드</th>
                  <th>이름</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr
                    key={policy.policy_id}
                    className={`interactive-row${editingPolicyId === policy.policy_id ? ' is-selected' : ''}`}
                    onClick={() => selectPolicy(policy)}
                    onKeyDown={(event) => handlePolicyRowKeyDown(event, policy)}
                    tabIndex={0}
                  >
                    <td>{policy.policy_code}</td>
                    <td>{policy.name}</td>
                    <td>{formatPolicyStatusLabel(policy.status)}</td>
                    <td>
                      <button
                        className="button ghost small"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handlePolicyDelete(policy.policy_id);
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty-state">정책이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">Policy Version List</p>
            <h2>정책 버전 목록</h2>
          </div>
          <button className="button primary" onClick={openCreateVersionModal} type="button">
            버전 생성
          </button>
        </div>
        {isLoading ? (
          <p className="empty-state">정책 버전을 불러오는 중입니다...</p>
        ) : versions.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">버전에서 실제 rule payload와 게시 상태를 관리합니다.</span>
              <span className="table-meta">총 {versions.length}개 버전</span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>정책</th>
                  <th>버전</th>
                  <th>상태</th>
                  <th>게시 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr
                    key={version.policy_version_id}
                    className={`interactive-row${editingVersionId === version.policy_version_id ? ' is-selected' : ''}`}
                    onClick={() => selectVersion(version)}
                    onKeyDown={(event) => handleVersionRowKeyDown(event, version)}
                    tabIndex={0}
                  >
                    <td>{getPolicyName(version.policy_id)}</td>
                    <td>v{version.version_number}</td>
                    <td>{formatPolicyVersionStatusLabel(version.status)}</td>
                    <td>{version.published_at ?? '-'}</td>
                    <td>
                      <button
                        className="button ghost small"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleVersionDelete(version.policy_version_id);
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty-state">정책 버전이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">Assignment List</p>
            <h2>정책 연결 목록</h2>
          </div>
          <button className="button primary" onClick={openCreateAssignmentModal} type="button">
            연결 생성
          </button>
        </div>
        {isLoading ? (
          <p className="empty-state">정책 연결을 불러오는 중입니다...</p>
        ) : assignments.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">회사와 플릿에 어떤 정책 버전이 언제부터 적용되는지 연결 상태를 유지합니다.</span>
              <span className="table-meta">총 {assignments.length}개 연결</span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>정책 버전</th>
                  <th>회사</th>
                  <th>플릿</th>
                  <th>기간</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.assignment_id}
                    className={`interactive-row${editingAssignmentId === assignment.assignment_id ? ' is-selected' : ''}`}
                    onClick={() => selectAssignment(assignment)}
                    onKeyDown={(event) => handleAssignmentRowKeyDown(event, assignment)}
                    tabIndex={0}
                  >
                    <td>{getVersionLabel(assignment.policy_version_id)}</td>
                    <td>{getCompanyName(companies, assignment.company_id)}</td>
                    <td>{getFleetName(fleets, assignment.fleet_id)}</td>
                    <td>
                      {assignment.effective_start_date} ~ {assignment.effective_end_date ?? '계속'}
                    </td>
                    <td>{formatPolicyStatusLabel(assignment.status)}</td>
                    <td>
                      <button
                        className="button ghost small"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleAssignmentDelete(assignment.assignment_id);
                        }}
                        type="button"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty-state">정책 연결이 없습니다.</p>
        )}
      </section>

      <FormModal
        isOpen={isPolicyModalOpen}
        kicker="Policy"
        onClose={closePolicyModal}
        title={editingPolicyId ? '정산 정책 수정' : '정산 정책 생성'}
      >
        <form className="form-stack" onSubmit={handlePolicySubmit}>
          <label className="field">
            <span>정책 코드</span>
            <input
              onChange={(event) => setPolicyForm((current) => ({ ...current, policy_code: event.target.value }))}
              value={policyForm.policy_code}
            />
          </label>
          <label className="field">
            <span>정책 이름</span>
            <input
              onChange={(event) => setPolicyForm((current) => ({ ...current, name: event.target.value }))}
              value={policyForm.name}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setPolicyForm((current) => ({ ...current, status: event.target.value }))}
              value={policyForm.status}
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </label>
          <label className="field">
            <span>설명</span>
            <textarea
              onChange={(event) => setPolicyForm((current) => ({ ...current, description: event.target.value }))}
              value={policyForm.description}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingPolicyId ? '정책 수정' : '정책 생성'}
            </button>
            <button className="button ghost" onClick={closePolicyModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isVersionModalOpen}
        kicker="Policy Version"
        onClose={closeVersionModal}
        title={editingVersionId ? '정책 버전 수정' : '정책 버전 생성'}
      >
        <form className="form-stack" onSubmit={handleVersionSubmit}>
          <label className="field">
            <span>정책</span>
            <select
              onChange={(event) => setVersionForm((current) => ({ ...current, policy_id: event.target.value }))}
              value={versionForm.policy_id}
            >
              {policies.map((policy) => (
                <option key={policy.policy_id} value={policy.policy_id}>
                  {policy.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>버전 번호</span>
            <input
              min="1"
              onChange={(event) => setVersionForm((current) => ({ ...current, version_number: event.target.value }))}
              step="1"
              type="number"
              value={versionForm.version_number}
            />
          </label>
          <label className="field">
            <span>규칙 JSON</span>
            <textarea
              onChange={(event) =>
                setVersionForm((current) => ({ ...current, rule_payload_text: event.target.value }))
              }
              value={versionForm.rule_payload_text}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setVersionForm((current) => ({ ...current, status: event.target.value }))}
              value={versionForm.status}
            >
              <option value="draft">초안</option>
              <option value="published">게시됨</option>
              <option value="retired">종료</option>
            </select>
          </label>
          <label className="field">
            <span>게시 시각</span>
            <input
              onChange={(event) => setVersionForm((current) => ({ ...current, published_at: event.target.value }))}
              type="datetime-local"
              value={versionForm.published_at}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingVersionId ? '버전 수정' : '버전 생성'}
            </button>
            <button className="button ghost" onClick={closeVersionModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isAssignmentModalOpen}
        kicker="Policy Assignment"
        onClose={closeAssignmentModal}
        title={editingAssignmentId ? '정책 연결 수정' : '정책 연결 생성'}
      >
        <form className="form-stack" onSubmit={handleAssignmentSubmit}>
          <label className="field">
            <span>정책 버전</span>
            <select
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, policy_version_id: event.target.value }))
              }
              value={assignmentForm.policy_version_id}
            >
              {versions.map((version) => (
                <option key={version.policy_version_id} value={version.policy_version_id}>
                  {getVersionLabel(version.policy_version_id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>회사</span>
            <select
              onChange={(event) => handleAssignmentCompanyChange(event.target.value)}
              value={assignmentForm.company_id}
            >
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select
              onChange={(event) => setAssignmentForm((current) => ({ ...current, fleet_id: event.target.value }))}
              value={assignmentForm.fleet_id}
            >
              {getFleetOptions(fleets, assignmentForm.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>시작일</span>
            <input
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, effective_start_date: event.target.value }))
              }
              type="date"
              value={assignmentForm.effective_start_date}
            />
          </label>
          <label className="field">
            <span>종료일</span>
            <input
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, effective_end_date: event.target.value }))
              }
              type="date"
              value={assignmentForm.effective_end_date}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setAssignmentForm((current) => ({ ...current, status: event.target.value }))}
              value={assignmentForm.status}
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingAssignmentId ? '연결 수정' : '연결 생성'}
            </button>
            <button className="button ghost" onClick={closeAssignmentModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
