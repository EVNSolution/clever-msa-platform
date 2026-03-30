import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createFleet, getCompany, getFleet, updateFleet } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Company } from '../types';

type FleetFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

export function FleetFormPage({ client, mode }: FleetFormPageProps) {
  const navigate = useNavigate();
  const { companyId, fleetId } = useParams();
  const isEdit = mode === 'edit';
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setErrorMessage('회사 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedCompanyId = companyId;
    const selectedFleetId = fleetId;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const companyResponse = await getCompany(client, selectedCompanyId);
        if (ignore) {
          return;
        }
        setCompany(companyResponse);

        if (!isEdit || !selectedFleetId) {
          setIsLoading(false);
          return;
        }

        const fleet = await getFleet(client, selectedFleetId);
        if (ignore) {
          return;
        }
        if (fleet.company_id !== selectedCompanyId) {
          setErrorMessage('회사와 플릿 관계가 맞지 않습니다.');
          setIsLoading(false);
          return;
        }
        setName(fleet.name);
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
  }, [client, companyId, fleetId, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyId) {
      setErrorMessage('회사 ID가 없습니다.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && fleetId) {
        await updateFleet(client, fleetId, { company_id: companyId, name });
        navigate(`/companies/${companyId}/fleets/${fleetId}`);
        return;
      }

      const created = await createFleet(client, { company_id: companyId, name });
      navigate(`/companies/${companyId}/fleets/${created.fleet_id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref =
    isEdit && companyId && fleetId ? `/companies/${companyId}/fleets/${fleetId}` : companyId ? `/companies/${companyId}` : '/companies';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">플릿 입력</p>
        <h2>{isEdit ? '플릿 수정' : '플릿 생성'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">플릿 입력 화면을 준비하는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>상위 회사</span>
            <input readOnly value={company?.name ?? ''} />
          </label>
          <label className="field">
            <span>플릿 이름</span>
            <input onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '플릿 수정' : '플릿 생성'}
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
