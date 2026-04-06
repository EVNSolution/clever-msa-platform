import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { canManageNotificationScope } from '../authScopes';
import { createPushSend, listGeneralNotifications, listPushDeliveryLogs, updateNotificationStatus } from '../api/notifications';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import type { GeneralNotification, PushDeliveryLog } from '../types';
import { formatNotificationStatusLabel, formatPushDeliveryStatusLabel } from '../uiLabels';

type NotificationsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

function SelfServiceNotifications({
  client,
  recipientAccountId,
}: {
  client: HttpClient;
  recipientAccountId: string;
}) {
  const [notifications, setNotifications] = useState<GeneralNotification[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listGeneralNotifications(client, { recipient_account_id: recipientAccountId });
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
  }, [client, recipientAccountId]);

  async function handleUpdate(notificationId: string, status: GeneralNotification['status']) {
    setErrorMessage(null);
    try {
      const next = await updateNotificationStatus(client, notificationId, status);
      setNotifications((current) => current.map((item) => (item.notification_id === notificationId ? next : item)));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function getNotificationMeta(notification: GeneralNotification) {
    if (notification.category === 'support' && notification.source_type === 'support_ticket' && notification.source_ref) {
      return `문의 번호 #${notification.source_ref}`;
    }
    return null;
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
                  {getNotificationMeta(notification) ? <p className="account-role">{getNotificationMeta(notification)}</p> : null}
                  <p className="panel-kicker">{formatNotificationStatusLabel(notification.status)}</p>
                </div>
                <div className="inline-actions">
                  {notification.category === 'support' &&
                  notification.source_type === 'support_ticket' &&
                  notification.source_ref ? (
                    <Link className="button ghost small" to={`/support?ticket=${notification.source_ref}`}>
                      문의 열기
                    </Link>
                  ) : null}
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

function ManagementNotifications({ client }: { client: HttpClient }) {
  const [notifications, setNotifications] = useState<GeneralNotification[]>([]);
  const [logs, setLogs] = useState<PushDeliveryLog[]>([]);
  const [targetAccountId, setTargetAccountId] = useState('');
  const [eventType, setEventType] = useState('');
  const [category, setCategory] = useState('general');
  const [sourceType, setSourceType] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [createInbox, setCreateInbox] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [notificationResponse, logResponse] = await Promise.all([
          listGeneralNotifications(client),
          listPushDeliveryLogs(client),
        ]);
        if (!ignore) {
          setNotifications(notificationResponse);
          setLogs(logResponse);
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

  async function reloadAll() {
    const [notificationResponse, logResponse] = await Promise.all([
      listGeneralNotifications(client),
      listPushDeliveryLogs(client),
    ]);
    setNotifications(notificationResponse);
    setLogs(logResponse);
  }

  async function handleSend() {
    setErrorMessage(null);
    try {
      await createPushSend(client, {
        target_account_id: targetAccountId,
        event_type: eventType,
        category,
        source_type: sourceType,
        source_ref: sourceRef,
        title,
        body,
        create_inbox: createInbox,
      });
      setTargetAccountId('');
      setEventType('');
      setCategory('general');
      setSourceType('');
      setSourceRef('');
      setTitle('');
      setBody('');
      setCreateInbox(true);
      await reloadAll();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="stack large-gap">
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">알림 발송</p>
          <h2>알림 관리</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <div className="form-grid">
          <label className="field">
            <span>대상 account_id</span>
            <input aria-label="대상 account_id" onChange={(event) => setTargetAccountId(event.target.value)} value={targetAccountId} />
          </label>
          <label className="field">
            <span>이벤트 타입</span>
            <input aria-label="이벤트 타입" onChange={(event) => setEventType(event.target.value)} value={eventType} />
          </label>
          <label className="field">
            <span>카테고리</span>
            <input aria-label="카테고리" onChange={(event) => setCategory(event.target.value)} value={category} />
          </label>
          <label className="field">
            <span>source_type</span>
            <input aria-label="source_type" onChange={(event) => setSourceType(event.target.value)} value={sourceType} />
          </label>
          <label className="field">
            <span>source_ref</span>
            <input aria-label="source_ref" onChange={(event) => setSourceRef(event.target.value)} value={sourceRef} />
          </label>
          <label className="field">
            <span>제목</span>
            <input aria-label="제목" onChange={(event) => setTitle(event.target.value)} value={title} />
          </label>
        </div>
        <label className="field">
          <span>본문</span>
          <textarea aria-label="본문" onChange={(event) => setBody(event.target.value)} rows={4} value={body} />
        </label>
        <label className="checkbox-field">
          <input checked={createInbox} onChange={(event) => setCreateInbox(event.target.checked)} type="checkbox" />
          <span>수신함 생성</span>
        </label>
        <button className="button primary" onClick={() => void handleSend()} type="button">
          알림 발송
        </button>
      </section>

      <div className="data-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">수신함</p>
            <h2>일반 알림</h2>
          </div>
          {isLoading ? (
            <p className="empty-state">알림을 불러오는 중입니다...</p>
          ) : notifications.length ? (
            <table className="table compact">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>상태</th>
                  <th>대상</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.notification_id}>
                    <td>{notification.title}</td>
                    <td>{formatNotificationStatusLabel(notification.status)}</td>
                    <td>{notification.recipient_account_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">등록된 알림이 없습니다.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">발송 로그</p>
            <h2>푸시 발송 이력</h2>
          </div>
          {isLoading ? (
            <p className="empty-state">발송 로그를 불러오는 중입니다...</p>
          ) : logs.length ? (
            <table className="table compact">
              <thead>
                <tr>
                  <th>이벤트</th>
                  <th>상태</th>
                  <th>대상</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.delivery_log_id}>
                    <td>{log.title}</td>
                    <td>{formatPushDeliveryStatusLabel(log.delivery_status)}</td>
                    <td>{log.target_account_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">발송 로그가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function NotificationsPage({ client, session }: NotificationsPageProps) {
  const recipientAccountId = session.activeAccount?.accountId;

  if (canManageNotificationScope(session)) {
    return <ManagementNotifications client={client} />;
  }

  if (!recipientAccountId) {
    return (
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">알림</p>
          <h2>알림</h2>
        </div>
        <p className="empty-state">알림 계정 문맥이 없습니다.</p>
      </section>
    );
  }

  return <SelfServiceNotifications client={client} recipientAccountId={recipientAccountId} />;
}
