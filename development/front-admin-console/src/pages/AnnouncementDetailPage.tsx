import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { canManageAnnouncementScope } from '../authScopes';
import { getAnnouncementBySlug } from '../api/announcements';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { formatAnnouncementScopeLabel, formatAnnouncementStatusLabel } from '../uiLabels';
import type { Announcement } from '../types';

type AnnouncementDetailPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function AnnouncementDetailPage({ client, session }: AnnouncementDetailPageProps) {
  const { announcementSlug } = useParams();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canManage = canManageAnnouncementScope(session);

  useEffect(() => {
    const slug = announcementSlug;
    if (!slug) {
      setErrorMessage('공지 슬러그가 없습니다.');
      setIsLoading(false);
      return;
    }

    let ignore = false;

    async function load(targetSlug: string) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAnnouncementBySlug(client, targetSlug);
        if (!ignore) {
          setAnnouncement(response);
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

    void load(slug);
    return () => {
      ignore = true;
    };
  }, [announcementSlug, client]);

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">공지 상세</p>
          <h2>{announcement?.title ?? '공지 상세'}</h2>
        </div>
        <div className="inline-actions">
          {announcementSlug && canManage ? (
            <Link className="button ghost" to={`/announcements/${announcementSlug}/edit`}>
              공지 수정
            </Link>
          ) : null}
          <Link className="button ghost" to="/announcements">
            목록으로
          </Link>
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">공지를 불러오는 중입니다...</p>
      ) : announcement && (canManage || (announcement.status === 'published' && announcement.exposure_scope !== 'driver')) ? (
        <div className="stack">
          <dl className="detail-list">
            <div>
              <dt>슬러그</dt>
              <dd>{announcement.slug}</dd>
            </div>
            <div>
              <dt>게시 상태</dt>
              <dd>{formatAnnouncementStatusLabel(announcement.status)}</dd>
            </div>
            <div>
              <dt>노출 범위</dt>
              <dd>{formatAnnouncementScopeLabel(announcement.exposure_scope)}</dd>
            </div>
            <div>
              <dt>게시 시각</dt>
              <dd>{announcement.published_at ?? '-'}</dd>
            </div>
            <div>
              <dt>종료 시각</dt>
              <dd>{announcement.expires_at ?? '-'}</dd>
            </div>
          </dl>
          <article className="panel subtle-panel">
            <h3>본문</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{announcement.body}</p>
          </article>
        </div>
      ) : (
        <p className="empty-state">공지에 접근할 수 없습니다.</p>
      )}
    </section>
  );
}
