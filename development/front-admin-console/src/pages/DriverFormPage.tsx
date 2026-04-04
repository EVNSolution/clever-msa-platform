import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createDriver, getDriver, updateDriver, type DriverPayload } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, Fleet } from '../types';

type DriverFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function createEmptyForm(companies: Company[], fleets: Fleet[]): DriverPayload {
  const defaultCompanyId = companies[0]?.company_id ?? '';
  const fleetOptions = fleets.filter((fleet) => fleet.company_id === defaultCompanyId);

  return {
    company_id: defaultCompanyId,
    fleet_id: fleetOptions[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '',
    name: '',
    ev_id: '',
    phone_number: '',
    address: '',
  };
}

export function DriverFormPage({ client, mode }: DriverFormPageProps) {
  const navigate = useNavigate();
  const { driverRef } = useParams();
  const isEdit = mode === 'edit';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [form, setForm] = useState<DriverPayload>(createEmptyForm([], []));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const selectedDriverRef = driverRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse, driverResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
          isEdit && selectedDriverRef ? getDriver(client, selectedDriverRef) : Promise.resolve(null),
        ]);
        if (ignore) {
          return;
        }

        setCompanies(companyResponse);
        setFleets(fleetResponse);

        if (driverResponse) {
          setForm({
            company_id: driverResponse.company_id,
            fleet_id: driverResponse.fleet_id,
            name: driverResponse.name,
            ev_id: driverResponse.ev_id,
            phone_number: driverResponse.phone_number,
            address: driverResponse.address,
          });
          return;
        }

        setForm(createEmptyForm(companyResponse, fleetResponse));
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

    if (isEdit && !selectedDriverRef) {
      setErrorMessage('배송원 경로 키가 없습니다.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client, driverRef, isEdit]);

  function getFleetOptions(companyId: string) {
    return fleets.filter((fleet) => fleet.company_id === companyId);
  }

  function handleCompanyChange(companyId: string) {
    const nextFleetId = getFleetOptions(companyId)[0]?.fleet_id ?? '';
    setForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id: getFleetOptions(companyId).some((fleet) => fleet.fleet_id === current.fleet_id)
        ? current.fleet_id
        : nextFleetId,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && driverRef) {
        const updated = await updateDriver(client, driverRef, form);
        navigate(`/drivers/${getDriverRouteRef(updated)}`);
        return;
      }

      const created = await createDriver(client, form);
      navigate(`/drivers/${getDriverRouteRef(created)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && driverRef ? `/drivers/${driverRef}` : '/drivers';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">배송원 입력</p>
        <h2>{isEdit ? '배송원 수정' : '배송원 생성'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배송원 정보를 불러오는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>회사</span>
            <select onChange={(event) => handleCompanyChange(event.target.value)} value={form.company_id}>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select onChange={(event) => setForm((current) => ({ ...current, fleet_id: event.target.value }))} value={form.fleet_id}>
              {getFleetOptions(form.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>이름</span>
            <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>
          <label className="field">
            <span>EV ID</span>
            <input onChange={(event) => setForm((current) => ({ ...current, ev_id: event.target.value }))} value={form.ev_id} />
          </label>
          <label className="field">
            <span>연락처</span>
            <input onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))} value={form.phone_number} />
          </label>
          <label className="field">
            <span>주소</span>
            <input onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '배송원 수정' : '배송원 생성'}
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
