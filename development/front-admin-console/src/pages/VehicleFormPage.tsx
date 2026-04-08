import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createVehicleMaster, getVehicleMaster, updateVehicleMaster, type VehicleMasterPayload } from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getVehicleRouteRef } from '../routeRefs';
import type { Company } from '../types';

type VehicleFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function createEmptyForm(companyId = ''): VehicleMasterPayload {
  return {
    manufacturer_company_id: companyId,
    plate_number: '',
    vin: '',
    manufacturer_vehicle_code: null,
    model_name: '',
    vehicle_status: 'active',
  };
}

export function VehicleFormPage({ client, mode }: VehicleFormPageProps) {
  const navigate = useNavigate();
  const { vehicleRef } = useParams();
  const isEdit = mode === 'edit';
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<VehicleMasterPayload>(createEmptyForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const selectedVehicleRef = vehicleRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, vehicleResponse] = await Promise.all([
          listCompanies(client),
          isEdit && selectedVehicleRef ? getVehicleMaster(client, selectedVehicleRef) : Promise.resolve(null),
        ]);
        if (ignore) {
          return;
        }

        setCompanies(companyResponse);

        if (vehicleResponse) {
          setForm({
            manufacturer_company_id: vehicleResponse.manufacturer_company_id,
            plate_number: vehicleResponse.plate_number,
            vin: vehicleResponse.vin,
            manufacturer_vehicle_code: vehicleResponse.manufacturer_vehicle_code,
            model_name: vehicleResponse.model_name,
            vehicle_status: vehicleResponse.vehicle_status,
          });
          return;
        }

        setForm(createEmptyForm(companyResponse[0]?.company_id ?? ''));
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

    if (isEdit && !selectedVehicleRef) {
      setErrorMessage('차량 경로 키가 없습니다.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client, isEdit, vehicleRef]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && vehicleRef) {
        const updated = await updateVehicleMaster(client, vehicleRef, form);
        navigate(`/vehicles/${getVehicleRouteRef(updated)}`);
        return;
      }

      const created = await createVehicleMaster(client, form);
      navigate(`/vehicles/${getVehicleRouteRef(created)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && vehicleRef ? `/vehicles/${vehicleRef}` : '/vehicles';

  return (
    <PageLayout
      subtitle="차량 정본과 제조사 메타데이터를 같은 입력 흐름에서 관리합니다."
      title={isEdit ? '차량 마스터 수정' : '차량 마스터 생성'}
    >
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">차량 입력</p>
          <h2>차량 기본 정보 입력</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">차량 정보를 불러오는 중입니다...</p>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>제조사 회사</span>
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, manufacturer_company_id: event.target.value }))
              }
              value={form.manufacturer_company_id}
            >
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>번호판</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, plate_number: event.target.value }))}
              value={form.plate_number}
            />
          </label>
          <label className="field">
            <span>VIN</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, vin: event.target.value }))}
              value={form.vin}
            />
          </label>
          <label className="field">
            <span>제조사 차량 코드</span>
            <input
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  manufacturer_vehicle_code: event.target.value.trim() || null,
                }))
              }
              value={form.manufacturer_vehicle_code ?? ''}
            />
          </label>
          <label className="field">
            <span>모델명</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, model_name: event.target.value }))}
              value={form.model_name}
            />
          </label>
          <label className="field">
            <span>차량 상태</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, vehicle_status: event.target.value }))}
              value={form.vehicle_status}
            >
              <option value="active">운영</option>
              <option value="inactive">중지</option>
              <option value="retired">퇴역</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '차량 수정' : '차량 생성'}
            </button>
            <Link className="button ghost" to={cancelHref}>
              취소
            </Link>
          </div>
          </form>
        )}
      </section>
    </PageLayout>
  );
}
