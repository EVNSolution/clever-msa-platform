import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteFleet, getCompany, getFleet } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Company, Fleet } from '../types';

type FleetDetailPageProps = {
  client: HttpClient;
};

export function FleetDetailPage({ client }: FleetDetailPageProps) {
  const navigate = useNavigate();
  const { companyId, fleetId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!companyId || !fleetId) {
      setErrorMessage('회사 또는 플릿 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedCompanyId = companyId;
    const selectedFleetId = fleetId;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          getCompany(client, selectedCompanyId),
          getFleet(client, selectedFleetId),
        ]);
        if (ignore) {
          return;
        }
        if (fleetResponse.company_id !== selectedCompanyId) {
          setErrorMessage('회사와 플릿 관계가 맞지 않습니다.');
          setIsLoading(false);
          return;
        }
        setCompany(companyResponse);
        setFleet(fleetResponse);
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
  }, [client, companyId, fleetId]);

  async function handleDelete() {
    if (!companyId || !fleetId || !fleet) {
      return;
    }
    if (!window.confirm(`플릿 "${fleet.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteFleet(client, fleetId);
      navigate(`/companies/${companyId}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">플릿 상세</p>
          <h2>{fleet?.name ?? '플릿 상세'}</h2>
        </div>
        <div className="inline-actions">
          {companyId && fleetId ? (
            <Link className="button ghost" to={`/companies/${companyId}/fleets/${fleetId}/edit`}>
              플릿 수정
            </Link>
          ) : null}
          <button className="button ghost" disabled={isDeleting || !fleet} onClick={() => void handleDelete()} type="button">
            {isDeleting ? '삭제 중...' : '플릿 삭제'}
          </button>
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">플릿을 불러오는 중입니다...</p>
      ) : fleet ? (
        <div className="stack">
          <dl className="detail-list">
            <div>
              <dt>플릿 이름</dt>
              <dd>{fleet.name}</dd>
            </div>
            <div>
              <dt>상위 회사</dt>
              <dd>{company?.name ?? '미확인 회사'}</dd>
            </div>
          </dl>
          <div className="page-actions">
            {companyId ? (
              <Link className="button ghost" to={`/companies/${companyId}`}>
                회사 상세로
              </Link>
            ) : null}
            <Link className="button ghost" to="/companies">
              회사 목록으로
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">플릿을 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
