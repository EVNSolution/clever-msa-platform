import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteCompany, getCompany, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getCompanyRouteRef, getFleetRouteRef } from '../routeRefs';
import type { Company, Fleet } from '../types';
import { PageLayout } from '../components/PageLayout';

type CompanyDetailPageProps = {
  client: HttpClient;
};

export function CompanyDetailPage({ client }: CompanyDetailPageProps) {
  const navigate = useNavigate();
  const { companyRef } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!companyRef) {
      setErrorMessage('회사 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedCompanyRef = companyRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          getCompany(client, selectedCompanyRef),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setCompany(companyResponse);
        setFleets(fleetResponse.filter((fleet) => fleet.company_id === companyResponse.company_id));
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
  }, [client, companyRef]);

  async function handleDelete() {
    if (!companyRef || !company) {
      return;
    }
    if (!window.confirm(`회사 "${company.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteCompany(client, companyRef);
      navigate('/companies');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  function handleFleetRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  return (
    <PageLayout
      actions={
        <>
          {company ? (
            <Link className="button ghost" to={`/companies/${getCompanyRouteRef(company)}/edit`}>
              회사 수정
            </Link>
          ) : null}
          <button className="button ghost" disabled={isDeleting || !company} onClick={() => void handleDelete()} type="button">
            {isDeleting ? '삭제 중...' : '회사 삭제'}
          </button>
        </>
      }
      contentClassName="data-grid two-columns relationship-grid"
      subtitle="회사 정본과 하위 플릿 연결 상태를 함께 확인합니다."
      title={company?.name ?? '회사 상세'}
    >
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">회사 요약</p>
          <h3>기본 정보</h3>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">회사를 불러오는 중입니다...</p>
        ) : company ? (
          <div className="stack">
            <div className="summary-strip">
              <article className="summary-item">
                <span>Company</span>
                <strong>{company.name}</strong>
                <small>현재 보고 있는 회사 정본 문맥입니다.</small>
              </article>
              <article className="summary-item">
                <span>Fleets</span>
                <strong>{fleets.length}</strong>
                <small>이 회사에 연결된 플릿 수</small>
              </article>
            </div>
            <dl className="detail-list">
              <div>
                <dt>회사 이름</dt>
                <dd>{company.name}</dd>
              </div>
              <div>
                <dt>플릿 수</dt>
                <dd>{fleets.length}</dd>
              </div>
            </dl>
            <div className="page-actions">
              <Link className="button ghost" to="/companies">
                목록으로
              </Link>
              {company ? (
                <Link className="button primary" to={`/companies/${getCompanyRouteRef(company)}/fleets/new`}>
                  플릿 생성
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="empty-state">회사를 찾을 수 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">하위 플릿</p>
          <h3>이 회사에 속한 플릿</h3>
        </div>
        {isLoading ? (
          <p className="empty-state">플릿을 불러오는 중입니다...</p>
        ) : fleets.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">플릿 행을 선택하면 상세로 이동하고, 같은 회사 문맥을 유지합니다.</span>
              <span className="table-meta">총 {fleets.length}개 플릿</span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>플릿</th>
                </tr>
              </thead>
              <tbody>
                {fleets.map((fleet) => {
                  const detailPath = `/companies/${companyRef}/fleets/${getFleetRouteRef(fleet)}`;

                  return (
                    <tr
                      key={fleet.fleet_id}
                      className="interactive-row"
                      data-detail-path={detailPath}
                      onClick={() => navigate(detailPath)}
                      onKeyDown={(event) => handleFleetRowKeyDown(event, detailPath)}
                      tabIndex={0}
                    >
                      <td>{fleet.name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty-state">이 회사에 연결된 플릿이 없습니다.</p>
        )}
      </section>
    </PageLayout>
  );
}
