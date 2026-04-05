import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { createDispatchPlan, getDispatchPlan, updateDispatchPlan } from '../api/dispatchRegistry';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import type { Company, Fleet } from '../types';

type DispatchPlanFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function getFleetBrowserRef(fleet: Fleet) {
  if (fleet.route_no != null) {
    return String(fleet.route_no);
  }
  if (fleet.public_ref) {
    return fleet.public_ref;
  }
  return fleet.fleet_id;
}

export function DispatchPlanFormPage({ client, mode }: DispatchPlanFormPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dispatchPlanRef } = useParams();
  const isEdit = mode === 'edit';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [fleetId, setFleetId] = useState('');
  const [dispatchDate, setDispatchDate] = useState(searchParams.get('dispatchDate') ?? '');
  const [plannedVolume, setPlannedVolume] = useState('');
  const [dispatchStatus, setDispatchStatus] = useState<'draft' | 'published' | 'closed'>('draft');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const selectedDispatchPlanRef = dispatchPlanRef;
    const selectedFleetRef = searchParams.get('fleetRef');
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse, planResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
          isEdit && selectedDispatchPlanRef
            ? getDispatchPlan(client, selectedDispatchPlanRef)
            : Promise.resolve(null),
        ]);
        if (ignore) {
          return;
        }

        setCompanies(companyResponse);
        setFleets(fleetResponse);

        if (planResponse) {
          setCompanyId(planResponse.company_id);
          setFleetId(planResponse.fleet_id);
          setDispatchDate(planResponse.dispatch_date);
          setPlannedVolume(String(planResponse.planned_volume));
          setDispatchStatus(planResponse.dispatch_status as 'draft' | 'published' | 'closed');
          return;
        }

        const initialFleet =
          (selectedFleetRef
            ? fleetResponse.find((fleet) => getFleetBrowserRef(fleet) === selectedFleetRef)
            : null) ?? fleetResponse[0] ?? null;
        const initialCompanyId = initialFleet?.company_id ?? companyResponse[0]?.company_id ?? '';
        setCompanyId(initialCompanyId);
        setFleetId(initialFleet?.fleet_id ?? '');
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
  }, [client, dispatchPlanRef, isEdit, searchParams]);

  const fleetOptions = useMemo(
    () => fleets.filter((fleet) => !companyId || fleet.company_id === companyId),
    [companyId, fleets],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId || !fleetId || !dispatchDate || !plannedVolume) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && dispatchPlanRef) {
        const updated = await updateDispatchPlan(client, dispatchPlanRef, {
          company_id: companyId,
          fleet_id: fleetId,
          dispatch_date: dispatchDate,
          planned_volume: Number(plannedVolume),
          dispatch_status: dispatchStatus,
        });
        const fleet = fleets.find((candidate) => candidate.fleet_id === updated.fleet_id);
        const fleetRef = fleet ? getFleetBrowserRef(fleet) : updated.fleet_id;
        navigate(`/dispatch/boards/${fleetRef}/${updated.dispatch_date}`);
        return;
      }

      const created = await createDispatchPlan(client, {
        company_id: companyId,
        fleet_id: fleetId,
        dispatch_date: dispatchDate,
        planned_volume: Number(plannedVolume),
        dispatch_status: dispatchStatus,
      });
      const fleet = fleets.find((candidate) => candidate.fleet_id === created.fleet_id);
      const fleetRef = fleet ? getFleetBrowserRef(fleet) : created.fleet_id;
      navigate(`/dispatch/boards/${fleetRef}/${created.dispatch_date}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = '/dispatch/boards';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">예상 물량 입력</p>
        <h2>{isEdit ? '예상 물량 수정' : '예상 물량 입력'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배차 계획을 불러오는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>회사</span>
            <select
              onChange={(event) => {
                const nextCompanyId = event.target.value;
                setCompanyId(nextCompanyId);
                const nextFleet = fleets.find((fleet) => fleet.company_id === nextCompanyId);
                setFleetId(nextFleet?.fleet_id ?? '');
              }}
              value={companyId}
            >
              <option value="">회사 선택</option>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select onChange={(event) => setFleetId(event.target.value)} value={fleetId}>
              <option value="">플릿 선택</option>
              {fleetOptions.map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>배차일</span>
            <input onChange={(event) => setDispatchDate(event.target.value)} value={dispatchDate} />
          </label>
          <label className="field">
            <span>예상 물량</span>
            <input
              aria-label="예상 물량"
              onChange={(event) => setPlannedVolume(event.target.value)}
              type="number"
              value={plannedVolume}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setDispatchStatus(event.target.value as 'draft' | 'published' | 'closed')}
              value={dispatchStatus}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="closed">closed</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '예상 물량 수정' : '예상 물량 입력'}
            </button>
            <Link className="button ghost" to={cancelHref}>
              취소
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
