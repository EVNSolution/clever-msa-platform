import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createVehicleOperatorAccess, getVehicleMaster } from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getVehicleRouteRef } from '../routeRefs';
import type { Company, VehicleMaster } from '../types';

type VehicleOperatorAccessFormPageProps = {
  client: HttpClient;
};

type VehicleOperatorAccessFormState = {
  operator_company_id: string;
};

function createTimestamp() {
  return new Date().toISOString();
}

export function VehicleOperatorAccessFormPage({ client }: VehicleOperatorAccessFormPageProps) {
  const navigate = useNavigate();
  const { vehicleRef } = useParams();
  const [vehicle, setVehicle] = useState<VehicleMaster | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<VehicleOperatorAccessFormState>({ operator_company_id: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!vehicleRef) {
      setErrorMessage('차량 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedVehicleRef = vehicleRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [vehicleResponse, companyResponse] = await Promise.all([
          getVehicleMaster(client, selectedVehicleRef),
          listCompanies(client),
        ]);
        if (ignore) {
          return;
        }

        setVehicle(vehicleResponse);
        setCompanies(companyResponse);
        setForm({
          operator_company_id: companyResponse[0]?.company_id ?? '',
        });
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
  }, [client, vehicleRef]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vehicle) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createVehicleOperatorAccess(client, {
        vehicle_id: vehicle.vehicle_id,
        operator_company_id: form.operator_company_id,
        access_status: 'active',
        started_at: createTimestamp(),
        ended_at: null,
      });
      navigate(`/vehicles/${getVehicleRouteRef(vehicle)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = vehicleRef ? `/vehicles/${vehicleRef}` : '/vehicles';

  return (
    <PageLayout
      subtitle="차량 문맥을 유지한 채 운영사 접근을 추가합니다."
      title="운영사 접근 생성"
    >
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">운영사 접근 입력</p>
          <h2>접근 정보</h2>
          <p className="empty-state">대상 차량과 운영사 회사를 먼저 확인한 뒤 접근을 생성합니다.</p>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">차량 정보를 불러오는 중입니다...</p>
        ) : vehicle ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="summary-strip">
              <article className="summary-item">
                <span>Vehicle</span>
                <strong>{vehicle.plate_number}</strong>
                <small>접근을 부여할 대상 차량</small>
              </article>
              <article className="summary-item">
                <span>Companies</span>
                <strong>{companies.length}</strong>
                <small>선택 가능한 운영사 회사 수</small>
              </article>
            </div>
            <div className="panel-toolbar">
              <span className="table-meta">운영사 접근은 차량 상세에서 이어지는 하위 액션입니다.</span>
              <span className="table-meta">입력 요약</span>
            </div>
            <label className="field">
              <span>대상 차량</span>
              <input readOnly value={vehicle.plate_number} />
            </label>
            <label className="field">
              <span>운영사 회사</span>
              <select
                onChange={(event) => setForm({ operator_company_id: event.target.value })}
                value={form.operator_company_id}
              >
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? '저장 중...' : '운영사 접근 생성'}
              </button>
              <Link className="button ghost" to={cancelHref}>
                취소
              </Link>
            </div>
          </form>
        ) : (
          <p className="empty-state">차량을 찾을 수 없습니다.</p>
        )}
      </section>
    </PageLayout>
  );
}
