import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { canManagePersonnelDocumentScope } from '../authScopes';
import { getDriver } from '../api/drivers';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { getPersonnelDocument } from '../api/personnelDocuments';
import type { DriverProfile, PersonnelDocument } from '../types';
import { formatPersonnelDocumentStatusLabel, formatPersonnelDocumentTypeLabel } from '../uiLabels';

type PersonnelDocumentDetailPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function PersonnelDocumentDetailPage({ client, session }: PersonnelDocumentDetailPageProps) {
  const { documentRef } = useParams();
  const [document, setDocument] = useState<PersonnelDocument | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canManage = canManagePersonnelDocumentScope(session);

  useEffect(() => {
    const targetRef = documentRef;
    if (!targetRef) {
      setErrorMessage('인사문서 식별자가 없습니다.');
      setIsLoading(false);
      return;
    }

    let ignore = false;

    async function load(resolvedDocumentRef: string) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const documentResponse = await getPersonnelDocument(client, resolvedDocumentRef);
        const driverResponse = await getDriver(client, documentResponse.driver_id);
        if (!ignore) {
          setDocument(documentResponse);
          setDriver(driverResponse);
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

    void load(targetRef);
    return () => {
      ignore = true;
    };
  }, [client, documentRef]);

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">인사문서 상세</p>
          <h2>인사문서 상세</h2>
        </div>
        <div className="inline-actions">
          {documentRef && canManage ? (
            <Link className="button ghost" to={`/personnel-documents/${documentRef}/edit`}>
              문서 수정
            </Link>
          ) : null}
          <Link className="button ghost" to="/personnel-documents">
            목록으로
          </Link>
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">인사문서를 불러오는 중입니다...</p>
      ) : document ? (
        <div className="stack">
          <article className="panel subtle-panel">
            <h3>기사 연결 정보</h3>
            <dl className="detail-list">
              <div>
                <dt>기사명</dt>
                <dd>{driver?.name ?? '미확인 기사'}</dd>
              </div>
              <div>
                <dt>기사 식별자</dt>
                <dd>{document.driver_id}</dd>
              </div>
            </dl>
          </article>
          <article className="panel subtle-panel">
            <h3>기본 문서 정보</h3>
            <dl className="detail-list">
              <div>
                <dt>문서 종류</dt>
                <dd>{formatPersonnelDocumentTypeLabel(document.document_type)}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{formatPersonnelDocumentStatusLabel(document.status)}</dd>
              </div>
              <div>
                <dt>제목</dt>
                <dd>{document.title}</dd>
              </div>
              <div>
                <dt>문서 번호</dt>
                <dd>{document.document_number ?? '-'}</dd>
              </div>
              <div>
                <dt>발급처</dt>
                <dd>{document.issuer_name ?? '-'}</dd>
              </div>
              <div>
                <dt>발급일</dt>
                <dd>{document.issued_on ?? '-'}</dd>
              </div>
              <div>
                <dt>만료일</dt>
                <dd>{document.expires_on ?? '-'}</dd>
              </div>
              <div>
                <dt>외부 참조</dt>
                <dd>{document.external_reference ?? '-'}</dd>
              </div>
              <div>
                <dt>메모</dt>
                <dd>{document.notes ?? '-'}</dd>
              </div>
            </dl>
          </article>
          <article className="panel subtle-panel">
            <h3>payload</h3>
            <pre>{JSON.stringify(document.payload, null, 2)}</pre>
          </article>
        </div>
      ) : (
        <p className="empty-state">인사문서를 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
