import { useEffect, useState } from 'react';

import { listAnnouncements } from '../api/announcements';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Announcement } from '../types';
import { formatAnnouncementScopeLabel, formatAnnouncementStatusLabel } from '../uiLabels';

type AnnouncementsPageProps = {
  client: HttpClient;
};

export function AnnouncementsPage({ client }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listAnnouncements(client);
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
  }, [client]);

  return (
    <section className="panel">
      <div className="panel-header">
        <p className="panel-kicker">공지</p>
        <h2>공지</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">공지를 불러오는 중입니다...</p>
      ) : announcements.length ? (
        <div className="stack">
          {announcements.map((announcement) => (
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
