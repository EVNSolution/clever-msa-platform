import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { bootstrapDailySnapshotsFromDispatch } from '../api/deliveryRecords';
import {
  ensureDriversByExternalUserNames,
  getEnsureDriversByExternalUserNamesErrorMessage,
  listDrivers,
} from '../api/drivers';
import type { SessionPayload } from '../api/http';
import { listDispatchUploadBatches } from '../api/dispatchRegistry';
import { getErrorMessage, type HttpClient } from '../api/http';
import { createFleet, listCompanies, listFleets } from '../api/organization';
import { DispatchUploadWizard } from '../components/DispatchUploadWizard';
import { PageLayout } from '../components/PageLayout';
import { isSystemAdmin } from '../authScopes';
import type { Company, DispatchUploadBatch, DriverProfile, Fleet } from '../types';

type DispatchUploadsPageProps = {
  client: HttpClient;
  dispatchBoardsPath?: string;
  layoutVariant?: 'default' | 'settlement';
  session: SessionPayload;
  settlementInputsPath?: string;
};

export function DispatchUploadsPage({
  client,
  dispatchBoardsPath = '/dispatch/boards',
  layoutVariant = 'default',
  session,
  settlementInputsPath = '/settlements/inputs',
}: DispatchUploadsPageProps) {
  const navigate = useNavigate();
  const [isSettlementScopeCollapsed, setIsSettlementScopeCollapsed] = useState(false);
  const [isSettlementScopeCollapsible, setIsSettlementScopeCollapsible] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [confirmedBatches, setConfirmedBatches] = useState<DispatchUploadBatch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [pendingDetectedFleetCode, setPendingDetectedFleetCode] = useState<string | null>(null);
  const [isCreatingDetectedFleet, setIsCreatingDetectedFleet] = useState(false);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [detectedExternalUserNames, setDetectedExternalUserNames] = useState<string[]>([]);
  const [isCreatingMissingDrivers, setIsCreatingMissingDrivers] = useState(false);

  const visibleFleets = useMemo(
    () => fleets.filter((fleet) => !selectedCompanyId || fleet.company_id === selectedCompanyId),
    [fleets, selectedCompanyId],
  );
  const detectedFleet = useMemo(() => {
    if (!pendingDetectedFleetCode) {
      return null;
    }

    return (
      visibleFleets.find((fleet) => fleet.name.trim().toUpperCase() === pendingDetectedFleetCode) ?? null
    );
  }, [pendingDetectedFleetCode, visibleFleets]);
  const requiresDetectedFleetCreation = Boolean(pendingDetectedFleetCode && !detectedFleet);
  const missingDriverNames = useMemo(() => {
    if (
      !selectedCompanyId ||
      !selectedFleetId ||
      detectedExternalUserNames.length === 0 ||
      pendingDetectedFleetCode
    ) {
      return [];
    }

    const existingExternalUserNames = new Set(
      drivers
        .map((driver) => driver.external_user_name.trim())
        .filter(Boolean),
    );
    return detectedExternalUserNames.filter((externalUserName) => !existingExternalUserNames.has(externalUserName));
  }, [detectedExternalUserNames, drivers, pendingDetectedFleetCode, selectedCompanyId, selectedFleetId]);
  const showCompanySelector = isSystemAdmin(session);
  const isSettlementLayout = layoutVariant === 'settlement';
  const isSettlementScopeSummaryOnly =
    isSettlementLayout && isSettlementScopeCollapsible && isSettlementScopeCollapsed;
  const canStartSettlement =
    Boolean(selectedCompanyId) &&
    Boolean(selectedFleetId) &&
    Boolean(dispatchDate) &&
    confirmedBatches.length > 0;
  const uploadSummary = useMemo(() => {
    const matchedRowCount = confirmedBatches.reduce(
      (sum, batch) => sum + batch.rows.filter((row) => Boolean(row.matched_driver_id)).length,
      0,
    );
    const totalRowCount = confirmedBatches.reduce((sum, batch) => sum + batch.rows.length, 0);
    const totalBoxCount = confirmedBatches.reduce(
      (sum, batch) => sum + batch.rows.reduce((rowSum, row) => rowSum + row.box_count, 0),
      0,
    );
    return { matchedRowCount, totalRowCount, totalBoxCount };
  }, [confirmedBatches]);

  useEffect(() => {
    let ignore = false;

    async function loadScopeOptions() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        const lockedCompanyId =
          !showCompanySelector && session.activeAccount?.companyId ? session.activeAccount.companyId : '';
        const nextCompanyId =
          lockedCompanyId && companyResponse.some((company) => company.company_id === lockedCompanyId)
            ? lockedCompanyId
            : companyResponse[0]?.company_id ?? '';
        const nextFleetId =
          fleetResponse.find((fleet) => fleet.company_id === nextCompanyId)?.fleet_id ?? '';
        setSelectedCompanyId(nextCompanyId);
        setSelectedFleetId(nextFleetId);
        setPendingDetectedFleetCode(null);
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

    void loadScopeOptions();
    return () => {
      ignore = true;
    };
  }, [client, session, showCompanySelector]);

  useEffect(() => {
    let ignore = false;

    async function loadDriversForScope() {
      if (!selectedCompanyId || !selectedFleetId) {
        setDrivers([]);
        return;
      }

      try {
        const response = await listDrivers(client, {
          company_id: selectedCompanyId,
          fleet_id: selectedFleetId,
        });
        if (!ignore) {
          setDrivers(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadDriversForScope();
    return () => {
      ignore = true;
    };
  }, [client, selectedCompanyId, selectedFleetId]);

  async function loadConfirmedBatches() {
    if (!selectedCompanyId || !selectedFleetId || !dispatchDate) {
      setConfirmedBatches([]);
      return;
    }

    const batches = await listDispatchUploadBatches(client, {
      company_id: selectedCompanyId,
      fleet_id: selectedFleetId,
      dispatch_date: dispatchDate,
      upload_status: 'confirmed',
    });
    setConfirmedBatches(batches);
  }

  useEffect(() => {
    let ignore = false;

    async function loadBatches() {
      if (!selectedCompanyId || !selectedFleetId || !dispatchDate) {
        setConfirmedBatches([]);
        return;
      }
      try {
        const batches = await listDispatchUploadBatches(client, {
          company_id: selectedCompanyId,
          fleet_id: selectedFleetId,
          dispatch_date: dispatchDate,
          upload_status: 'confirmed',
        });
        if (!ignore) {
          setConfirmedBatches(batches);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadBatches();
    return () => {
      ignore = true;
    };
  }, [client, dispatchDate, selectedCompanyId, selectedFleetId]);

  useEffect(() => {
    if (!isSettlementLayout || typeof window === 'undefined') {
      setIsSettlementScopeCollapsible(false);
      setIsSettlementScopeCollapsed(false);
      return;
    }

    const syncCollapsibleState = () => {
      const nextIsCollapsible = window.innerWidth <= 1240;
      setIsSettlementScopeCollapsible(nextIsCollapsible);
      if (!nextIsCollapsible) {
        setIsSettlementScopeCollapsed(false);
      }
    };

    syncCollapsibleState();
    window.addEventListener('resize', syncCollapsibleState);
    return () => {
      window.removeEventListener('resize', syncCollapsibleState);
    };
  }, [isSettlementLayout]);

  async function handleBootstrapSettlementInputs() {
    if (!selectedCompanyId || !selectedFleetId || !dispatchDate) {
      return;
    }
    setIsBootstrapping(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await bootstrapDailySnapshotsFromDispatch(client, {
        company_id: selectedCompanyId,
        fleet_id: selectedFleetId,
        service_date: dispatchDate,
      });
      setStatusMessage('배차표 업로드 기준으로 정산 입력 snapshot을 준비했습니다.');
      navigate(settlementInputsPath);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsBootstrapping(false);
    }
  }

  function handleFleetCodeDetected(fleetCode: string | null) {
    if (!fleetCode) {
      setPendingDetectedFleetCode(null);
      return;
    }

    const matchedFleet =
      visibleFleets.find((fleet) => fleet.name.trim().toUpperCase() === fleetCode) ?? null;
    if (matchedFleet?.fleet_id === selectedFleetId) {
      setPendingDetectedFleetCode(null);
      return;
    }

    setPendingDetectedFleetCode(fleetCode);
  }

  function handleApplyDetectedFleet() {
    if (!detectedFleet) {
      return;
    }

    setSelectedFleetId(detectedFleet.fleet_id);
    setPendingDetectedFleetCode(null);
    setStatusMessage(`감지된 플릿 ${detectedFleet.name}을 적용했습니다.`);
  }

  async function handleCreateDetectedFleet() {
    if (!pendingDetectedFleetCode || !selectedCompanyId) {
      return;
    }

    setIsCreatingDetectedFleet(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const createdFleet = await createFleet(client, {
        company_id: selectedCompanyId,
        name: pendingDetectedFleetCode,
      });
      setFleets((currentFleets) => [...currentFleets, createdFleet]);
      setSelectedFleetId(createdFleet.fleet_id);
      setPendingDetectedFleetCode(null);
      setStatusMessage(`플릿 ${createdFleet.name}을 생성하고 선택했습니다.`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreatingDetectedFleet(false);
    }
  }

  async function handleCreateMissingDrivers() {
    if (!selectedCompanyId || !selectedFleetId || missingDriverNames.length === 0) {
      return;
    }

    setIsCreatingMissingDrivers(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await ensureDriversByExternalUserNames(client, {
        company_id: selectedCompanyId,
        fleet_id: selectedFleetId,
        external_user_names: missingDriverNames,
      });
      setDrivers((currentDrivers) => {
        const driverById = new Map(currentDrivers.map((driver) => [driver.driver_id, driver]));
        response.drivers.forEach((driver) => {
          driverById.set(driver.driver_id, driver);
        });
        return Array.from(driverById.values());
      });
      setStatusMessage(`배송원 ${response.created_external_user_names.length}명을 생성했습니다.`);
    } catch (error) {
      setErrorMessage(getEnsureDriversByExternalUserNamesErrorMessage(error));
    } finally {
      setIsCreatingMissingDrivers(false);
    }
  }

  return (
    <PageLayout subtitle="회사, 플릿, 날짜 기준으로 배차표 업로드를 확정합니다." title="배차표 업로드">
      {isSettlementLayout ? (
        <div className="dispatch-upload-settlement-shell">
          <section className={`panel dispatch-upload-scope-inline${isSettlementScopeSummaryOnly ? ' is-collapsed' : ''}`}>
            {isLoading ? (
              <p className="empty-state">업로드 범위를 불러오는 중입니다...</p>
            ) : isSettlementScopeSummaryOnly ? (
            <button
              aria-label="업로드 범위 펼치기"
              className="dispatch-upload-scope-inline-summary"
              onClick={() => setIsSettlementScopeCollapsed(false)}
              type="button"
            >
              <span className="dispatch-upload-scope-inline-summary-kicker">업로드 범위</span>
            </button>
            ) : (
              <>
                <div className="dispatch-upload-scope-inline-header">
                  <div className="dispatch-upload-scope-inline-copy">
                    <p className="panel-kicker">업로드 범위</p>
                    <h2>회사, 플릿, 날짜</h2>
                    <p className="table-meta">업로드와 정산 기준 범위를 먼저 고릅니다.</p>
                  </div>
                  {isSettlementScopeCollapsible ? (
                    <button
                      aria-expanded={!isSettlementScopeCollapsed}
                      aria-label="업로드 범위 접기"
                      className="dispatch-upload-scope-toggle"
                      onClick={() => setIsSettlementScopeCollapsed(true)}
                      type="button"
                    >
                      접기
                    </button>
                  ) : null}
                </div>
                {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
                {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
                <div className="dispatch-upload-scope-inline-body">
                  <div className="dispatch-upload-scope-inline-fields">
                    {showCompanySelector ? (
                      <label className="field">
                        <select
                          aria-label="회사"
                          onChange={(event) => {
                            const nextCompanyId = event.target.value;
                            setSelectedCompanyId(nextCompanyId);
                            setPendingDetectedFleetCode(null);
                            const nextFleetId =
                              fleets.find((fleet) => fleet.company_id === nextCompanyId)?.fleet_id ?? '';
                            setSelectedFleetId(nextFleetId);
                          }}
                          value={selectedCompanyId}
                        >
                          <option value="">회사 선택</option>
                          {companies.map((company) => (
                            <option key={company.company_id} value={company.company_id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <label className="field">
                      <select
                        aria-label="플릿"
                        onChange={(event) => {
                          setSelectedFleetId(event.target.value);
                          setPendingDetectedFleetCode(null);
                        }}
                        value={selectedFleetId}
                      >
                        <option value="">플릿 선택</option>
                        {visibleFleets.map((fleet) => (
                          <option key={fleet.fleet_id} value={fleet.fleet_id}>
                            {fleet.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <input
                        aria-label="배차일"
                        onChange={(event) => setDispatchDate(event.target.value)}
                        type="date"
                        value={dispatchDate}
                      />
                    </label>
                  </div>
                  <div className="dispatch-upload-scope-summary">
                    <span className="dispatch-upload-scope-stat">확정 {confirmedBatches.length}</span>
                    <span className="dispatch-upload-scope-stat">매칭 {uploadSummary.matchedRowCount}</span>
                    <span className="dispatch-upload-scope-stat">박스 {uploadSummary.totalBoxCount}</span>
                  </div>
                  <div className="dispatch-upload-sidebar-actions dispatch-upload-scope-inline-actions">
                    <Link className="button ghost" to={dispatchBoardsPath}>
                      배차 계획 보기
                    </Link>
                  </div>
                </div>
              </>
            )}
          </section>

          <div className="dispatch-upload-main is-settlement">
            <DispatchUploadWizard
              client={client}
              companyId={selectedCompanyId}
              fleetId={selectedFleetId}
              dispatchDate={dispatchDate}
              drivers={drivers}
              onDispatchDateDetected={setDispatchDate}
              onFleetCodeDetected={handleFleetCodeDetected}
              pendingDetectedFleetCode={pendingDetectedFleetCode}
              requiresDetectedFleetCreation={requiresDetectedFleetCreation}
              isCreatingDetectedFleet={isCreatingDetectedFleet}
              onApplyDetectedFleet={handleApplyDetectedFleet}
              onCreateDetectedFleet={handleCreateDetectedFleet}
              onDismissDetectedFleet={() => setPendingDetectedFleetCode(null)}
              pendingMissingDriverNames={missingDriverNames}
              isCreatingMissingDrivers={isCreatingMissingDrivers}
              onCreateMissingDrivers={handleCreateMissingDrivers}
              onExternalUserNamesChanged={setDetectedExternalUserNames}
              confirmedBatches={confirmedBatches}
              isStartingSettlement={isBootstrapping}
              onConfirmed={loadConfirmedBatches}
              onStartSettlement={handleBootstrapSettlementInputs}
            />
          </div>
        </div>
      ) : (
        <div className="dispatch-upload-workbench">
          <section className="panel dispatch-upload-sidebar">
            <div className="panel-header dispatch-upload-compact-header">
              <p className="panel-kicker">업로드 범위</p>
              <h2>회사, 플릿, 날짜</h2>
              <p className="table-meta">업로드와 정산 기준 범위를 먼저 고릅니다.</p>
            </div>
            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
            {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
            {isLoading ? (
              <p className="empty-state">업로드 범위를 불러오는 중입니다...</p>
            ) : (
              <>
                <div className="dispatch-upload-scope-grid">
                  {showCompanySelector ? (
                    <label className="field">
                      <select
                        aria-label="회사"
                        onChange={(event) => {
                          const nextCompanyId = event.target.value;
                          setSelectedCompanyId(nextCompanyId);
                          setPendingDetectedFleetCode(null);
                          const nextFleetId =
                            fleets.find((fleet) => fleet.company_id === nextCompanyId)?.fleet_id ?? '';
                          setSelectedFleetId(nextFleetId);
                        }}
                        value={selectedCompanyId}
                      >
                        <option value="">회사 선택</option>
                        {companies.map((company) => (
                          <option key={company.company_id} value={company.company_id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="field">
                    <select
                      aria-label="플릿"
                      onChange={(event) => {
                        setSelectedFleetId(event.target.value);
                        setPendingDetectedFleetCode(null);
                      }}
                      value={selectedFleetId}
                    >
                      <option value="">플릿 선택</option>
                      {visibleFleets.map((fleet) => (
                        <option key={fleet.fleet_id} value={fleet.fleet_id}>
                          {fleet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <input
                      aria-label="배차일"
                      onChange={(event) => setDispatchDate(event.target.value)}
                      type="date"
                      value={dispatchDate}
                    />
                  </label>
                </div>
                <div className="dispatch-upload-scope-summary">
                  <span className="dispatch-upload-scope-stat">확정 {confirmedBatches.length}</span>
                  <span className="dispatch-upload-scope-stat">매칭 {uploadSummary.matchedRowCount}</span>
                  <span className="dispatch-upload-scope-stat">박스 {uploadSummary.totalBoxCount}</span>
                </div>
                <div className="dispatch-upload-sidebar-actions">
                  <Link className="button ghost" to={dispatchBoardsPath}>
                    배차 계획 보기
                  </Link>
                </div>
              </>
            )}
          </section>

          <div className="dispatch-upload-main">
            <DispatchUploadWizard
              client={client}
              companyId={selectedCompanyId}
              fleetId={selectedFleetId}
              dispatchDate={dispatchDate}
              drivers={drivers}
              onDispatchDateDetected={setDispatchDate}
              onFleetCodeDetected={handleFleetCodeDetected}
              pendingDetectedFleetCode={pendingDetectedFleetCode}
              requiresDetectedFleetCreation={requiresDetectedFleetCreation}
              isCreatingDetectedFleet={isCreatingDetectedFleet}
              onApplyDetectedFleet={handleApplyDetectedFleet}
              onCreateDetectedFleet={handleCreateDetectedFleet}
              onDismissDetectedFleet={() => setPendingDetectedFleetCode(null)}
              pendingMissingDriverNames={missingDriverNames}
              isCreatingMissingDrivers={isCreatingMissingDrivers}
              onCreateMissingDrivers={handleCreateMissingDrivers}
              onExternalUserNamesChanged={setDetectedExternalUserNames}
              confirmedBatches={confirmedBatches}
              isStartingSettlement={isBootstrapping}
              onConfirmed={loadConfirmedBatches}
              onStartSettlement={handleBootstrapSettlementInputs}
            />
          </div>
        </div>
      )}
    </PageLayout>
  );
}
