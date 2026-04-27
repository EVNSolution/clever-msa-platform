import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { resetLocalSandboxMockState } from '../devSandbox/mockState';
import { clearStoredSession, persistSession } from '../sessionPersistence';
import { resolveAllowedSessionPreset, resolveDevSessionPreset } from '../devSandbox/sessionPresets';

function getCurrentHost() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.host;
}

export function DevSessionPage() {
  const navigate = useNavigate();
  const host = getCurrentHost();
  const allowedPresets = useMemo(() => resolveAllowedSessionPreset(host), [host]);
  const allowedPresetLabel = allowedPresets.length > 0 ? allowedPresets.join(', ') : '없음';

  function handleInjectSession() {
    const preset = resolveDevSessionPreset(host);
    if (!preset) {
      return;
    }

    persistSession(preset.session);
    navigate('/', { replace: true });
  }

  function handleReset() {
    clearStoredSession();
    resetLocalSandboxMockState();
    navigate('/', { replace: true });
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-panel panel">
        <p className="panel-kicker">local-sandbox</p>
        <h1>/__dev__/session</h1>
        <p className="hero-copy">
          현재 host: <strong>{host}</strong>
        </p>
        <p className="hero-copy">
          허용 preset: <strong>{allowedPresetLabel}</strong>
        </p>
        <div className="stack">
          <button
            className="button primary"
            disabled={allowedPresets.length === 0}
            onClick={handleInjectSession}
            type="button"
          >
            세션 주입
          </button>
          <button className="button ghost" onClick={handleReset} type="button">
            세션 초기화
          </button>
        </div>
      </section>
    </div>
  );
}
