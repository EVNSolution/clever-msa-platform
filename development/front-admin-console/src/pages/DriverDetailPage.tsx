import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { canManageDriverProfileScope } from '../authScopes';
import { listDriverAccountLinks } from '../api/driverAccountLinks';
import { getDriver360 } from '../api/driver360';
import { deleteDriver, getDriver } from '../api/drivers';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, Driver360Summary, DriverAccountLinkSummary, DriverProfile, Fleet } from '../types';
import { formatAccountStatusLabel, formatPayoutStatusLabel, formatSettlementStatusLabel } from '../uiLabels';

type DriverDetailPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function DriverDetailPage({ client, session }: DriverDetailPageProps) {
  const navigate = useNavigate();
  const { driverRef } = useParams();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [driverAccountLinks, setDriverAccountLinks] = useState<DriverAccountLinkSummary[]>([]);
  const [driverSummary, setDriverSummary] = useState<Driver360Summary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driverSummaryError, setDriverSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const canManageDriverProfiles = canManageDriverProfileScope(session);

  useEffect(() => {
    if (!driverRef) {
      setErrorMessage('배송원 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedDriverRef = driverRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, companyResponse, fleetResponse] = await Promise.all([
          getDriver(client, selectedDriverRef),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDriver(driverResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        const driverAccountLinkResponse = await listDriverAccountLinks(client, { driverId: driverResponse.driver_id });
        if (!ignore) {
          setDriverAccountLinks(driverAccountLinkResponse);
        }
        try {
          const summaryResponse = await getDriver360(client, selectedDriverRef);
          if (!ignore) {
            setDriverSummary(summaryResponse);
            setDriverSummaryError(null);
          }
        } catch (summaryError) {
          if (!ignore) {
            setDriverSummary(null);
            setDriverSummaryError(getErrorMessage(summaryError));
          }
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
  }, [client, driverRef]);

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  const activeDriverAccountLink = driverAccountLinks[0] ?? null;

  async function handleDelete() {
    if (!driverRef || !driver) {
      return;
    }
    if (!window.confirm(`배송원 "${driver.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriver(client, driverRef);
      navigate('/drivers');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  return (
    <PageLayout
      actions={
        <div className="inline-actions">
          {driver && canManageDriverProfiles ? (
            <Link className="button ghost" to={`/drivers/${getDriverRouteRef(driver)}/edit`}>
              배송원 수정
            </Link>
          ) : null}
          {canManageDriverProfiles ? (
            <button className="button ghost" disabled={isDeleting || !driver} onClick={() => void handleDelete()} type="button">
              {isDeleting ? '삭제 중...' : '배송원 삭제'}
            </button>
          ) : null}
        </div>
      }
      subtitle="배송원 정본과 계정·정산 문맥을 함께 확인합니다."
      title={driver?.name ?? '배송원 상세'}
    >
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {driverSummaryError ? <div className="error-banner">{driverSummaryError}</div> : null}
      {isLoading ? (
        <p className="empty-state">배송원 정보를 불러오는 중입니다...</p>
      ) : driver ? (
        <div className="stack">
          <div className="data-grid two-columns">
            <article className="panel subtle-panel">
              <div className="panel-header">
                <p className="panel-kicker">기본 정보</p>
                <h3>기본 프로필</h3>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>회사</dt>
                  <dd>{getCompanyName(driver.company_id)}</dd>
                </div>
                <div>
                  <dt>플릿</dt>
                  <dd>{getFleetName(driver.fleet_id)}</dd>
                </div>
                <div>
                  <dt>EV ID</dt>
                  <dd>{driver.ev_id}</dd>
                </div>
                <div>
                  <dt>연락처</dt>
                  <dd>{driver.phone_number}</dd>
                </div>
                <div>
                  <dt>주소</dt>
                  <dd>{driver.address}</dd>
                </div>
              </dl>
            </article>

            <article className="panel subtle-panel">
              <div className="panel-header">
                <p className="panel-kicker">배송원 계정</p>
                <h3>연결된 배송원 계정</h3>
              </div>
              {driverSummary?.driver_account_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>이름</dt>
                    <dd>{driverSummary.driver_account_identity_name}</dd>
                  </div>
                  <div>
                    <dt>이메일</dt>
                    <dd>{driverSummary.driver_account_email}</dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{formatAccountStatusLabel(driverSummary.driver_account_status)}</dd>
                  </div>
                </dl>
              ) : (
                <dl className="detail-list">
                  <div>
                    <dt>배송원 계정</dt>
                    <dd>{activeDriverAccountLink?.email ?? '미연결'}</dd>
                  </div>
                  <div>
                    <dt>계정 이름</dt>
                    <dd>{activeDriverAccountLink?.identity_name ?? '미연결'}</dd>
                  </div>
                  <div>
                    <dt>계정 상태</dt>
                    <dd>{formatAccountStatusLabel(activeDriverAccountLink?.account_status)}</dd>
                  </div>
                </dl>
              )}
            </article>
          </div>

          <div className="data-grid two-columns">
            <article className="panel subtle-panel">
              <div className="panel-header">
                <p className="panel-kicker">정산</p>
                <h3>최근 정산 정보</h3>
              </div>
              {driverSummary?.latest_settlement_run_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>기간</dt>
                    <dd>
                      {driverSummary.latest_settlement_period_start} - {driverSummary.latest_settlement_period_end}
                    </dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{formatSettlementStatusLabel(driverSummary.latest_settlement_status)}</dd>
                  </div>
                  <div>
                    <dt>지급 상태</dt>
                    <dd>{formatPayoutStatusLabel(driverSummary.latest_payout_status)}</dd>
                  </div>
                  <div>
                    <dt>금액</dt>
                    <dd>{driverSummary.latest_settlement_amount}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-state">정산 정보가 없습니다.</p>
              )}
            </article>

            <article className="panel subtle-panel">
              <div className="panel-header">
                <p className="panel-kicker">주의 사항</p>
                <h3>누락된 참조</h3>
              </div>
              {driverSummary?.warnings.length ? (
                <ul className="warning-list">
                  {driverSummary.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">주의 사항이 없습니다.</p>
              )}
            </article>
          </div>
          <div className="page-actions">
            <Link className="button ghost" to="/drivers">
              목록으로
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">배송원을 찾을 수 없습니다.</p>
      )}
    </PageLayout>
  );
}
