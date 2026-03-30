import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createCompany, getCompany, updateCompany } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getCompanyRouteRef } from '../routeRefs';

type CompanyFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

export function CompanyFormPage({ client, mode }: CompanyFormPageProps) {
  const navigate = useNavigate();
  const { companyRef } = useParams();
  const isEdit = mode === 'edit';
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !companyRef) {
      setIsLoading(false);
      return;
    }

    const selectedCompanyRef = companyRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const company = await getCompany(client, selectedCompanyRef);
        if (!ignore) {
          setName(company.name);
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
  }, [client, companyRef, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && companyRef) {
        const updated = await updateCompany(client, companyRef, { name });
        navigate(`/companies/${getCompanyRouteRef(updated)}`);
        return;
      }

      const created = await createCompany(client, { name });
      navigate(`/companies/${getCompanyRouteRef(created)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && companyRef ? `/companies/${companyRef}` : '/companies';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">회사 입력</p>
        <h2>{isEdit ? '회사 수정' : '회사 생성'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">회사를 불러오는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>회사 이름</span>
            <input onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '회사 수정' : '회사 생성'}
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
