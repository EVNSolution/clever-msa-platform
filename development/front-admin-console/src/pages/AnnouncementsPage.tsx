import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { canManageAnnouncementScope } from '../authScopes';
import { listAnnouncements } from '../api/announcements';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { getAnnouncementRouteRef } from '../routeRefs';
import type { Announcement } from '../types';
import { formatAnnouncementScopeLabel, formatAnnouncementStatusLabel } from '../uiLabels';

type AnnouncementsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function AnnouncementsPage({ client, session }: AnnouncementsPageProps) {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canManage = canManageAnnouncementScope(session);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listAnnouncements(client, canManage ? {} : { status: 'published' });
        if (!ignore) {
          setAnnouncements(response);
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
  }, [canManage, client]);

  const visibleAnnouncements = useMemo(() => {
    if (canManage) {
      return announcements;
    }

    return announcements.filter(
      (announcement) =>
        announcement.status === 'published' &&
        (announcement.exposure_scope === 'all' || announcement.exposure_scope === 'operator'),
    );
  }, [announcements, canManage]);

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  if (!canManage) {
    return (
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">공지</p>
          <h2>공지</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">공지를 불러오는 중입니다...</p>
        ) : visibleAnnouncements.length ? (
          <div className="stack">
            {visibleAnnouncements.map((announcement) => (
              <article key={announcement.announcement_id} className="panel subtle-panel">
                <div className="panel-header panel-header-inline">
                  <div>
                    <h3>{announcement.title}</h3>
                    <div className="inline-actions">
                      <span className="pill">{formatAnnouncementStatusLabel(announcement.status)}</span>
                      <span className="pill muted">{formatAnnouncementScopeLabel(announcement.exposure_scope)}</span>
                    </div>
                  </div>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{announcement.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">게시된 공지가 없습니다.</p>
        )}
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">공지 관리</p>
          <h2>공지 목록</h2>
        </div>
        <Link className="button primary" to="/announcements/new">
          공지 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">공지를 불러오는 중입니다...</p>
      ) : visibleAnnouncements.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>제목</th>
              <th>상태</th>
              <th>노출 범위</th>
              <th>게시 시각</th>
            </tr>
          </thead>
          <tbody>
            {visibleAnnouncements.map((announcement) => {
              const detailPath = `/announcements/${getAnnouncementRouteRef(announcement)}`;

              return (
                <tr
                  key={announcement.announcement_id}
                  className="interactive-row"
                  data-detail-path={detailPath}
                  onClick={() => navigate(detailPath)}
                  onKeyDown={(event) => handleRowKeyDown(event, detailPath)}
                  tabIndex={0}
                >
                  <td>{announcement.title}</td>
                  <td>{formatAnnouncementStatusLabel(announcement.status)}</td>
                  <td>{formatAnnouncementScopeLabel(announcement.exposure_scope)}</td>
                  <td>{announcement.published_at ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 공지가 없습니다.</p>
      )}
    </section>
  );
}
