import { useEffect, useState } from 'react';

export type TopNotificationTone = 'success' | 'error';

export type TopNotification = {
  id: number;
  dedupeKey: string;
  message: string;
  tone: TopNotificationTone;
  expiresAt: number;
};

type TopNotificationBarProps = {
  notice: TopNotification;
  onDismiss: (id: number) => void;
};

export const DISPLAY_DURATION_MS = 3000;
const EXIT_DURATION_MS = 240;

export function TopNotificationBar({ notice, onDismiss }: TopNotificationBarProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setIsExiting(false);
    const remainingMs = Math.max(notice.expiresAt - Date.now(), 0);
    const dismissTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, remainingMs);

    return () => {
      window.clearTimeout(dismissTimer);
    };
  }, [notice.expiresAt, notice.id]);

  useEffect(() => {
    if (!isExiting) {
      return;
    }

    const exitTimer = window.setTimeout(() => {
      onDismiss(notice.id);
    }, EXIT_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
    };
  }, [isExiting, notice.id, onDismiss]);

  const role = notice.tone === 'error' ? 'alert' : 'status';
  const toneLabel = notice.tone === 'error' ? '오류 로그' : '일반 로그';

  return (
    <div className={isExiting ? 'top-notice-region is-exiting' : 'top-notice-region is-entered'} data-tone={notice.tone}>
      <div className={isExiting ? 'top-notice is-exiting' : 'top-notice is-entered'} data-tone={notice.tone} role={role}>
        <span className="top-notice-pill">{toneLabel}</span>
        <span className="top-notice-message">{notice.message}</span>
      </div>
    </div>
  );
}
