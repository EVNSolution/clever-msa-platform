import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createAnnouncement, getAnnouncementBySlug, updateAnnouncement } from '../api/announcements';
import { getErrorMessage, type HttpClient } from '../api/http';
import { PageLayout } from '../components/PageLayout';
import { getAnnouncementRouteRef } from '../routeRefs';

type AnnouncementFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function fromApiDateTime(value: string | null) {
  if (!value) {
    return '';
  }
  return value.replace('Z', '').slice(0, 16);
}

function toApiDateTime(value: string) {
  if (!value) {
    return null;
  }
  return `${value}:00Z`;
}

export function AnnouncementFormPage({ client, mode }: AnnouncementFormPageProps) {
  const navigate = useNavigate();
  const { announcementSlug } = useParams();
  const isEdit = mode === 'edit';
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [exposureScope, setExposureScope] = useState<'all' | 'driver' | 'operator'>('operator');
  const [publishedAt, setPublishedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const slug = announcementSlug;
    if (!isEdit || !slug) {
      setIsLoading(false);
      return;
    }

    let ignore = false;

    async function load(targetSlug: string) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const announcement = await getAnnouncementBySlug(client, targetSlug);
        if (ignore) {
          return;
        }
        setAnnouncementId(announcement.announcement_id);
        setSlug(announcement.slug);
        setTitle(announcement.title);
        setBody(announcement.body);
        setStatus(announcement.status);
        setExposureScope(announcement.exposure_scope);
        setPublishedAt(fromApiDateTime(announcement.published_at));
        setExpiresAt(fromApiDateTime(announcement.expires_at));
        setIsPinned(announcement.is_pinned);
        setDisplayOrder(String(announcement.display_order));
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

    void load(slug);
    return () => {
      ignore = true;
    };
  }, [announcementSlug, client, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    const payload = {
      slug,
      title,
      body,
      status,
      exposure_scope: exposureScope,
      published_at: toApiDateTime(publishedAt),
      expires_at: toApiDateTime(expiresAt),
      is_pinned: isPinned,
      display_order: Number(displayOrder || 0),
    } as const;
    try {
      const saved = isEdit && announcementId
        ? await updateAnnouncement(client, announcementId, payload)
        : await createAnnouncement(client, payload);
      navigate(`/announcements/${getAnnouncementRouteRef(saved)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && announcementSlug ? `/announcements/${announcementSlug}` : '/announcements';

  return (
    <PageLayout
      subtitle="공지 메타데이터와 게시 설정을 같은 입력 흐름에서 관리합니다."
      title={isEdit ? '공지 수정' : '공지 생성'}
    >
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">공지를 불러오는 중입니다...</p>
      ) : (
        <form className="form-stack panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <p className="panel-kicker">공지 입력</p>
            <h2>게시 정보</h2>
            <p className="empty-state">입력 전 기본 상태를 먼저 확인하고 저장합니다.</p>
          </div>
          <div className="summary-strip">
            <article className="summary-item">
              <span>Mode</span>
              <strong>{isEdit ? '수정' : '생성'}</strong>
              <small>현재 공지 편집 모드</small>
            </article>
            <article className="summary-item">
              <span>Status</span>
              <strong>{status}</strong>
              <small>저장 시 적용될 게시 상태</small>
            </article>
            <article className="summary-item">
              <span>Scope</span>
              <strong>{exposureScope}</strong>
              <small>현재 선택된 노출 범위</small>
            </article>
          </div>
          <div className="panel-toolbar">
            <span className="table-meta">게시 일정과 노출 범위를 먼저 정하고 본문을 저장합니다.</span>
            <span className="table-meta">게시 설정 요약</span>
          </div>
          <label className="field">
            <span>슬러그</span>
            <input aria-label="슬러그" onChange={(event) => setSlug(event.target.value)} value={slug} />
          </label>
          <label className="field">
            <span>제목</span>
            <input aria-label="제목" onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>
          <label className="field">
            <span>본문</span>
            <textarea aria-label="본문" onChange={(event) => setBody(event.target.value)} rows={6} value={body} />
          </label>
          <label className="field">
            <span>게시 상태</span>
            <select aria-label="게시 상태" onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label className="field">
            <span>노출 범위</span>
            <select
              aria-label="노출 범위"
              onChange={(event) => setExposureScope(event.target.value as typeof exposureScope)}
              value={exposureScope}
            >
              <option value="all">all</option>
              <option value="operator">operator</option>
              <option value="driver">driver</option>
            </select>
          </label>
          <label className="field">
            <span>게시 시각</span>
            <input
              aria-label="게시 시각"
              onChange={(event) => setPublishedAt(event.target.value)}
              type="datetime-local"
              value={publishedAt}
            />
          </label>
          <label className="field">
            <span>종료 시각</span>
            <input
              aria-label="종료 시각"
              onChange={(event) => setExpiresAt(event.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </label>
          <label className="field">
            <span>정렬 순서</span>
            <input
              aria-label="정렬 순서"
              min="0"
              onChange={(event) => setDisplayOrder(event.target.value)}
              step="1"
              type="number"
              value={displayOrder}
            />
          </label>
          <label className="checkbox-field">
            <input
              aria-label="상단 고정"
              checked={isPinned}
              onChange={(event) => setIsPinned(event.target.checked)}
              type="checkbox"
            />
            <span>상단 고정</span>
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
    </PageLayout>
  );
}
