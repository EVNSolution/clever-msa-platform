import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { canManagePersonnelDocumentScope } from '../authScopes';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { listPersonnelDocuments } from '../api/personnelDocuments';
import type { DriverProfile, PersonnelDocument } from '../types';
import { formatPersonnelDocumentStatusLabel, formatPersonnelDocumentTypeLabel } from '../uiLabels';

type PersonnelDocumentsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function PersonnelDocumentsPage({ client, session }: PersonnelDocumentsPageProps) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PersonnelDocument[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverFilter, setDriverFilter] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canManage = canManagePersonnelDocumentScope(session);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = {
          ...(driverFilter ? { driver_id: driverFilter } : {}),
          ...(documentTypeFilter ? { document_type: documentTypeFilter as PersonnelDocument['document_type'] } : {}),
          ...(statusFilter ? { status: statusFilter as PersonnelDocument['status'] } : {}),
        };
        const [documentResponse, driverResponse] = await Promise.all([
          listPersonnelDocuments(client, params),
          listDrivers(client),
        ]);
        if (!ignore) {
          setDocuments(documentResponse);
          setDrivers(driverResponse);
        }
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
  }, [client, driverFilter, documentTypeFilter, statusFilter]);

  const driverNameMap = useMemo(
    () => new Map(drivers.map((driver) => [driver.driver_id, driver.name])),
    [drivers],
  );

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">인사문서</p>
          <h2>인사문서 목록</h2>
        </div>
        {canManage ? (
          <Link className="button primary" to="/personnel-documents/new">
            문서 등록
          </Link>
        ) : null}
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <div className="inline-filters">
        <label className="field">
          <span>기사 필터</span>
          <select aria-label="기사 필터" onChange={(event) => setDriverFilter(event.target.value)} value={driverFilter}>
            <option value="">전체 기사</option>
            {drivers.map((driver) => (
              <option key={driver.driver_id} value={driver.driver_id}>
                {driver.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>문서 종류 필터</span>
          <select
            aria-label="문서 종류 필터"
            onChange={(event) => setDocumentTypeFilter(event.target.value)}
            value={documentTypeFilter}
          >
            <option value="">전체 종류</option>
            <option value="contract">계약서</option>
            <option value="license_or_certificate">자격/증빙</option>
            <option value="bank_account_proof">계좌 증빙</option>
            <option value="business_registration">사업자 등록</option>
          </select>
        </label>
        <label className="field">
          <span>상태 필터</span>
          <select aria-label="상태 필터" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">전체 상태</option>
            <option value="draft">초안</option>
            <option value="active">활성</option>
            <option value="expired">만료</option>
            <option value="revoked">해제</option>
          </select>
        </label>
      </div>
      {isLoading ? (
        <p className="empty-state">인사문서를 불러오는 중입니다...</p>
      ) : documents.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>기사명</th>
              <th>기사 식별자</th>
              <th>문서 종류</th>
              <th>상태</th>
              <th>제목</th>
              <th>발급일</th>
              <th>만료일</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => {
              const detailPath = `/personnel-documents/${document.personnel_document_id}`;
              return (
                <tr
                  key={document.personnel_document_id}
                  className="interactive-row"
                  data-detail-path={detailPath}
                  onClick={() => navigate(detailPath)}
                  onKeyDown={(event) => handleRowKeyDown(event, detailPath)}
                  tabIndex={0}
                >
                  <td>{driverNameMap.get(document.driver_id) ?? '미확인 기사'}</td>
                  <td>{document.driver_id}</td>
                  <td>{formatPersonnelDocumentTypeLabel(document.document_type)}</td>
                  <td>{formatPersonnelDocumentStatusLabel(document.status)}</td>
                  <td>{document.title}</td>
                  <td>{document.issued_on ?? '-'}</td>
                  <td>{document.expires_on ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 인사문서가 없습니다.</p>
      )}
    </section>
  );
}
