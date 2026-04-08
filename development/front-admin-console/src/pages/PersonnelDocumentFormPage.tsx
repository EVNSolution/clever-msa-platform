import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { createPersonnelDocument, getPersonnelDocument, updatePersonnelDocument } from '../api/personnelDocuments';
import type { DriverProfile, PersonnelDocument } from '../types';
import { PageLayout } from '../components/PageLayout';

type PersonnelDocumentFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function toPayloadValue(raw: string) {
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw) as Record<string, unknown>;
}

export function PersonnelDocumentFormPage({ client, mode }: PersonnelDocumentFormPageProps) {
  const navigate = useNavigate();
  const { documentRef } = useParams();
  const isEdit = mode === 'edit';
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [driverId, setDriverId] = useState('');
  const [documentType, setDocumentType] = useState<PersonnelDocument['document_type']>('contract');
  const [status, setStatus] = useState<PersonnelDocument['status']>('draft');
  const [title, setTitle] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [notes, setNotes] = useState('');
  const [payloadText, setPayloadText] = useState('{}');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const driverResponse = await listDrivers(client);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);

        if (isEdit && documentRef) {
          const documentResponse = await getPersonnelDocument(client, documentRef);
          if (ignore) {
            return;
          }
          setDriverId(documentResponse.driver_id);
          setDocumentType(documentResponse.document_type);
          setStatus(documentResponse.status);
          setTitle(documentResponse.title);
          setDocumentNumber(documentResponse.document_number ?? '');
          setIssuerName(documentResponse.issuer_name ?? '');
          setIssuedOn(documentResponse.issued_on ?? '');
          setExpiresOn(documentResponse.expires_on ?? '');
          setExternalReference(documentResponse.external_reference ?? '');
          setNotes(documentResponse.notes ?? '');
          setPayloadText(JSON.stringify(documentResponse.payload, null, 2));
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
  }, [client, documentRef, isEdit]);

  const formTitle = useMemo(() => (isEdit ? '인사문서 수정' : '인사문서 등록'), [isEdit]);
  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.driver_id === driverId) ?? null,
    [driverId, drivers],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        driver_id: driverId,
        document_type: documentType,
        status,
        title,
        document_number: documentNumber || null,
        issuer_name: issuerName || null,
        issued_on: issuedOn || null,
        expires_on: expiresOn || null,
        external_reference: externalReference || null,
        notes: notes || null,
        payload: toPayloadValue(payloadText),
      };

      const saved = isEdit && documentRef
        ? await updatePersonnelDocument(client, documentRef, payload)
        : await createPersonnelDocument(client, payload);

      navigate(`/personnel-documents/${saved.personnel_document_id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '인사문서를 저장할 수 없습니다.'));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && documentRef ? `/personnel-documents/${documentRef}` : '/personnel-documents';

  return (
    <PageLayout
      subtitle="기사 연결 상태를 유지한 채 문서 메타데이터를 입력합니다."
      title={formTitle}
    >
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">인사문서 입력</p>
          <h2>문서 메타데이터 입력</h2>
          <p className="empty-state">기사 선택과 문서 수명주기 설정을 먼저 고정합니다.</p>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">인사문서를 준비하는 중입니다...</p>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="summary-strip">
              <article className="summary-item">
                <span>Mode</span>
                <strong>{isEdit ? 'Edit' : 'Create'}</strong>
                <small>{isEdit ? '기존 문서를 수정합니다.' : '새 문서를 등록합니다.'}</small>
              </article>
              <article className="summary-item">
                <span>Drivers</span>
                <strong>{drivers.length}</strong>
                <small>선택 가능한 기사 수</small>
              </article>
              <article className="summary-item">
                <span>Selected Driver</span>
                <strong>{selectedDriver?.name ?? '미선택'}</strong>
                <small>기사 선택 후 문서가 driver에 연결됩니다.</small>
              </article>
            </div>
            <label className="field">
              <span>기사</span>
              <select aria-label="기사" onChange={(event) => setDriverId(event.target.value)} required value={driverId}>
                <option value="">기사 선택</option>
                {drivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>문서 종류</span>
              <select aria-label="문서 종류" onChange={(event) => setDocumentType(event.target.value as PersonnelDocument['document_type'])} value={documentType}>
                <option value="contract">계약서</option>
                <option value="license_or_certificate">자격/증빙</option>
                <option value="bank_account_proof">계좌 증빙</option>
                <option value="business_registration">사업자 등록</option>
              </select>
            </label>
            <label className="field">
              <span>상태</span>
              <select aria-label="상태" onChange={(event) => setStatus(event.target.value as PersonnelDocument['status'])} value={status}>
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="revoked">revoked</option>
              </select>
            </label>
            <label className="field">
              <span>제목</span>
              <input aria-label="제목" onChange={(event) => setTitle(event.target.value)} required value={title} />
            </label>
            <label className="field">
              <span>문서 번호</span>
              <input aria-label="문서 번호" onChange={(event) => setDocumentNumber(event.target.value)} value={documentNumber} />
            </label>
            <label className="field">
              <span>발급처</span>
              <input aria-label="발급처" onChange={(event) => setIssuerName(event.target.value)} value={issuerName} />
            </label>
            <label className="field">
              <span>발급일</span>
              <input aria-label="발급일" onChange={(event) => setIssuedOn(event.target.value)} type="date" value={issuedOn} />
            </label>
            <label className="field">
              <span>만료일</span>
              <input aria-label="만료일" onChange={(event) => setExpiresOn(event.target.value)} type="date" value={expiresOn} />
            </label>
            <label className="field">
              <span>외부 참조</span>
              <input aria-label="외부 참조" onChange={(event) => setExternalReference(event.target.value)} value={externalReference} />
            </label>
            <label className="field">
              <span>메모</span>
              <textarea aria-label="메모" onChange={(event) => setNotes(event.target.value)} rows={4} value={notes} />
            </label>
            <label className="field">
              <span>payload</span>
              <textarea aria-label="payload" onChange={(event) => setPayloadText(event.target.value)} rows={8} value={payloadText} />
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? '저장 중...' : '저장'}
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
