import { useEffect, useState } from 'react';

import { listGeneralNotifications, updateNotificationStatus } from '../api/notifications';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { GeneralNotification } from '../types';
import { formatNotificationStatusLabel } from '../uiLabels';

type NotificationsPageProps = {
  client: HttpClient;
};

export function NotificationsPage({ client }: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<GeneralNotification[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listGeneralNotifications(client);
        if (!ignore) {
          setNotifications(response);
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

  async function handleUpdate(notificationId: string, status: GeneralNotification['status']) {
    setErrorMessage(null);
    try {
      const next = await updateNotificationStatus(client, notificationId, status);
      setNotifications((current) => current.map((item) => (item.notification_id === notificationId ? next : item)));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <p className="panel-kicker">알림</p>
        <h2>알림</h2>
      </div>
      <p className="empty-state">지원 답변이 등록되면 이 알림함에 일반 알림으로 함께 도착합니다.</p>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">알림을 불러오는 중입니다...</p>
      ) : notifications.length ? (
        <div className="stack">
          {notifications.map((notification) => (
            <article key={notification.notification_id} className="panel subtle-panel">
              <div className="panel-header panel-header-inline">
                <div>
                  <h3>{notification.title}</h3>
                  <p className="panel-kicker">{formatNotificationStatusLabel(notification.status)}</p>
                </div>
                <div className="inline-actions">
                  {notification.status === 'unread' ? (
                    <button
                      className="button ghost small"
                      onClick={() => void handleUpdate(notification.notification_id, 'read')}
                      type="button"
                    >
                      읽음 처리
                    </button>
                  ) : null}
                  {notification.status !== 'archived' ? (
                    <button
                      className="button ghost small"
                      onClick={() => void handleUpdate(notification.notification_id, 'archived')}
                      type="button"
                    >
                      보관
                    </button>
                  ) : null}
                </div>
              </div>
              <p>{notification.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-state">수신한 알림이 없습니다.</p>
      )}
    </section>
  );
}
