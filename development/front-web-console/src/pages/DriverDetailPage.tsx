import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { canManageDriverProfileScope } from '../authScopes';
import { listManageableDriverAccounts } from '../api/driverAccounts';
import { createDriverAccountLink, listDriverAccountLinks, unlinkDriverAccountLink } from '../api/driverAccountLinks';
import { getDriver360 } from '../api/driver360';
import { deleteDriver, getDriver } from '../api/drivers';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, Driver360Summary, DriverAccountLinkSummary, DriverAccountSummary, DriverProfile, Fleet } from '../types';
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
  const [manageableDriverAccounts, setManageableDriverAccounts] = useState<DriverAccountSummary[]>([]);
  const [selectedDriverAccountId, setSelectedDriverAccountId] = useState('');
  const [driverSummary, setDriverSummary] = useState<Driver360Summary | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driverSummaryError, setDriverSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDriverAccountLink, setIsSavingDriverAccountLink] = useState(false);
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
        const [driverAccountLinkResponse, driverAccountResponse] = await Promise.all([
          listDriverAccountLinks(client, { driverId: driverResponse.driver_id }),
          listManageableDriverAccounts(client),
        ]);
        if (!ignore) {
          setDriverAccountLinks(driverAccountLinkResponse);
          setManageableDriverAccounts(driverAccountResponse.accounts);
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

  const activeDriverAccountLink = driverAccountLinks.find((link) => link.unlinked_at == null) ?? null;
  const availableDriverAccounts = driver
    ? manageableDriverAccounts.filter(
        (account) =>
          account.company_id === driver.company_id &&
          (account.active_driver_id == null || account.active_driver_id === driver.driver_id),
      )
    : [];

  async function reloadDriverAccountCard(driverId: string) {
    const [driverAccountLinkResponse, driverAccountResponse] = await Promise.all([
      listDriverAccountLinks(client, { driverId }),
      listManageableDriverAccounts(client),
    ]);
    setDriverAccountLinks(driverAccountLinkResponse);
    setManageableDriverAccounts(driverAccountResponse.accounts);
    setSelectedDriverAccountId('');
  }

  async function handleLinkDriverAccount() {
    if (!driver || !selectedDriverAccountId) {
      return;
    }

    setIsSavingDriverAccountLink(true);
    setErrorMessage(null);
    try {
      await createDriverAccountLink(client, selectedDriverAccountId, driver.driver_id);
      await reloadDriverAccountCard(driver.driver_id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingDriverAccountLink(false);
    }
  }

  async function handleUnlinkDriverAccount(linkId: string) {
    if (!driver) {
      return;
    }

    setIsSavingDriverAccountLink(true);
    setErrorMessage(null);
    try {
      await unlinkDriverAccountLink(client, linkId);
      await reloadDriverAccountCard(driver.driver_id);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingDriverAccountLink(false);
    }
  }

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
                  <dt>원청 앱 사용자명</dt>
                  <dd>{driver.external_user_name || '미입력'}</dd>
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
              <dl className="detail-list">
                <div>
                  <dt>배송원 계정</dt>
                  <dd>{activeDriverAccountLink?.email ?? driverSummary?.driver_account_email ?? '미연결'}</dd>
                </div>
                <div>
                  <dt>계정 이름</dt>
                  <dd>{activeDriverAccountLink?.identity_name ?? driverSummary?.driver_account_identity_name ?? '미연결'}</dd>
                </div>
                <div>
                  <dt>계정 상태</dt>
                  <dd>{formatAccountStatusLabel(activeDriverAccountLink?.account_status ?? driverSummary?.driver_account_status)}</dd>
                </div>
              </dl>
              {canManageDriverProfiles ? (
                <div className="stack">
                  {activeDriverAccountLink ? (
                    <button
                      className="button ghost small"
                      disabled={isSavingDriverAccountLink}
                      onClick={() => void handleUnlinkDriverAccount(activeDriverAccountLink.driver_account_link_id)}
                      type="button"
                    >
                      {isSavingDriverAccountLink ? '처리 중...' : '연결 해제'}
                    </button>
                  ) : (
                    <div className="inline-actions">
                      <label className="field">
                        <select
                          aria-label="배송원 계정 선택"
                          disabled={isSavingDriverAccountLink || availableDriverAccounts.length === 0}
                          onChange={(event) => setSelectedDriverAccountId(event.target.value)}
                          value={selectedDriverAccountId}
                        >
                          <option value="">배송원 계정 선택</option>
                          {availableDriverAccounts.map((account) => (
                            <option key={account.driver_account_id} value={account.driver_account_id}>
                              {account.identity.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="button ghost small"
                        disabled={isSavingDriverAccountLink || !selectedDriverAccountId}
                        onClick={() => void handleLinkDriverAccount()}
                        type="button"
                      >
                        {isSavingDriverAccountLink ? '처리 중...' : '계정 연결'}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
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
