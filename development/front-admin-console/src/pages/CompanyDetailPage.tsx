import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteCompany, getCompany, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Company, Fleet } from '../types';

type CompanyDetailPageProps = {
  client: HttpClient;
};

export function CompanyDetailPage({ client }: CompanyDetailPageProps) {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setErrorMessage('회사 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedCompanyId = companyId;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          getCompany(client, selectedCompanyId),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setCompany(companyResponse);
        setFleets(fleetResponse.filter((fleet) => fleet.company_id === selectedCompanyId));
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
  }, [client, companyId]);

  async function handleDelete() {
    if (!companyId || !company) {
      return;
    }
    if (!window.confirm(`회사 "${company.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteCompany(client, companyId);
      navigate('/companies');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  return (
    <div className="data-grid two-columns relationship-grid">
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">회사 상세</p>
            <h2>{company?.name ?? '회사 상세'}</h2>
          </div>
          <div className="inline-actions">
            {companyId ? (
              <Link className="button ghost" to={`/companies/${companyId}/edit`}>
                회사 수정
              </Link>
            ) : null}
            <button className="button ghost" disabled={isDeleting || !company} onClick={() => void handleDelete()} type="button">
              {isDeleting ? '삭제 중...' : '회사 삭제'}
            </button>
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">회사를 불러오는 중입니다...</p>
        ) : company ? (
          <div className="stack">
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
              {companyId ? (
                <Link className="button primary" to={`/companies/${companyId}/fleets/new`}>
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
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">하위 플릿</p>
            <h2>이 회사에 속한 플릿</h2>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">플릿을 불러오는 중입니다...</p>
        ) : fleets.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>플릿</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {fleets.map((fleet) => (
                <tr key={fleet.fleet_id}>
                  <td>{fleet.name}</td>
                  <td>
                    <Link className="button ghost small" to={`/companies/${fleet.company_id}/fleets/${fleet.fleet_id}`}>
                      보기
                    </Link>
                  </td>
                  <td>
                    <Link className="button ghost small" to={`/companies/${fleet.company_id}/fleets/${fleet.fleet_id}/edit`}>
                      수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">이 회사에 연결된 플릿이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
