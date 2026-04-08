import { useEffect, useState } from 'react';

import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { getIdentityConsent, recoverIdentityConsent } from '../api/identity';
import { PageLayout } from '../components/PageLayout';
import type { IdentityConsentCurrent } from '../types';

type ConsentRecoveryPageProps = {
  client: HttpClient;
  onRecovered: (session: SessionPayload) => void;
  onLogout: () => void | Promise<void>;
};

export function ConsentRecoveryPage({ client, onRecovered, onLogout }: ConsentRecoveryPageProps) {
  const [consent, setConsent] = useState<IdentityConsentCurrent | null>(null);
  const [privacyConsented, setPrivacyConsented] = useState(false);
  const [locationConsented, setLocationConsented] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const nextConsent = await getIdentityConsent(client);
        if (ignore) {
          return;
        }
        setConsent(nextConsent);
        setPrivacyConsented(Boolean(nextConsent.privacy_policy_consented));
        setLocationConsented(Boolean(nextConsent.location_policy_consented));
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

  async function handleRecover() {
    if (!consent) {
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const session = await recoverIdentityConsent(client, {
        privacy_policy_version: consent.privacy_policy_version,
        privacy_policy_consented: privacyConsented,
        location_policy_version: consent.location_policy_version,
        location_policy_consented: locationConsented,
      });
      onRecovered(session);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-panel panel blocked-panel">
        <PageLayout subtitle="필수 동의를 다시 확인하고 일반 세션으로 복귀합니다." title="동의 복구">
          <h2>필수 동의를 다시 확인해야 합니다.</h2>
          <p className="hero-copy">
            개인정보처리와 위치기반 동의를 모두 다시 확인해야 일반 화면으로 돌아갈 수 있습니다.
          </p>
        {isLoading ? <p className="empty-state">현재 동의 상태를 불러오는 중입니다...</p> : null}
        {consent ? (
          <div className="stack">
            <label className="field-inline">
              <input
                checked={privacyConsented}
                onChange={(event) => setPrivacyConsented(event.target.checked)}
                type="checkbox"
              />
              <span>개인정보처리 동의</span>
            </label>
            <label className="field-inline">
              <input
                checked={locationConsented}
                onChange={(event) => setLocationConsented(event.target.checked)}
                type="checkbox"
              />
              <span>위치기반 동의</span>
            </label>
          </div>
        ) : null}
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <div className="inline-actions">
          <button className="button primary" disabled={!consent || isSubmitting} onClick={() => void handleRecover()} type="button">
            {isSubmitting ? '동의 복구 중...' : '동의 복구'}
          </button>
          <button className="button ghost" onClick={() => void onLogout()} type="button">
            로그아웃
          </button>
        </div>
        </PageLayout>
      </section>
    </div>
  );
}
