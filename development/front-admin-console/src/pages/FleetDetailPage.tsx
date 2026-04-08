import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteFleet, getCompany, getFleet } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getCompanyRouteRef, getFleetRouteRef } from '../routeRefs';
import type { Company, Fleet } from '../types';
import { PageLayout } from '../components/PageLayout';

type FleetDetailPageProps = {
  client: HttpClient;
};

export function FleetDetailPage({ client }: FleetDetailPageProps) {
  const navigate = useNavigate();
  const { companyRef, fleetRef } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!companyRef || !fleetRef) {
      setErrorMessage('회사 또는 플릿 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedCompanyRef = companyRef;
    const selectedFleetRef = fleetRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          getCompany(client, selectedCompanyRef),
          getFleet(client, selectedFleetRef),
        ]);
        if (ignore) {
          return;
        }
        if (fleetResponse.company_id !== companyResponse.company_id) {
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
  }, [client, companyRef, fleetRef]);

  async function handleDelete() {
    if (!companyRef || !fleetRef || !fleet) {
      return;
    }
    if (!window.confirm(`플릿 "${fleet.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteFleet(client, fleetRef);
      navigate(company ? `/companies/${getCompanyRouteRef(company)}` : '/companies');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  return (
    <PageLayout
      actions={
        <>
          {company && fleet ? (
            <Link className="button ghost" to={`/companies/${getCompanyRouteRef(company)}/fleets/${getFleetRouteRef(fleet)}/edit`}>
              플릿 수정
            </Link>
          ) : null}
          <button className="button ghost" disabled={isDeleting || !fleet} onClick={() => void handleDelete()} type="button">
            {isDeleting ? '삭제 중...' : '플릿 삭제'}
          </button>
        </>
      }
      subtitle="회사 문맥과 플릿 연결 상태를 함께 확인합니다."
      title={fleet?.name ?? '플릿 상세'}
    >
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">플릿 문맥</p>
          <h2>기본 정보</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">플릿을 불러오는 중입니다...</p>
        ) : fleet ? (
          <div className="stack">
            <div className="summary-strip">
              <article className="summary-item">
                <span>Fleet</span>
                <strong>{fleet.name}</strong>
                <small>현재 보고 있는 플릿 정본</small>
              </article>
              <article className="summary-item">
                <span>Company</span>
                <strong>{company?.name ?? '미확인 회사'}</strong>
                <small>상위 회사 문맥</small>
              </article>
            </div>
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
              {company ? (
                <Link className="button ghost" to={`/companies/${getCompanyRouteRef(company)}`}>
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
    </PageLayout>
  );
}
