import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { refreshIdentitySession, type IdentitySession, logoutIdentity } from "./auth-api";
import { loadAuthPreference, saveAuthPreference } from "./auth-storage";

type AuthSessionContextValue = {
  session: IdentitySession | null;
  isBootstrapping: boolean;
  rememberedEmail: string;
  rememberedPreferenceEnabled: boolean;
  setSession: (session: IdentitySession | null) => void;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [rememberedEmail, setRememberedEmail] = useState("");
  const [rememberedPreferenceEnabled, setRememberedPreferenceEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const preference = await loadAuthPreference();
        if (cancelled) {
          return;
        }

        setRememberedEmail(preference?.lastEmail ?? "");
        setRememberedPreferenceEnabled(preference?.rememberMe === true);

        if (preference?.logoutRequiredOnLaunch) {
          await logoutIdentity().catch(() => undefined);
          if (cancelled) {
            return;
          }
          await saveAuthPreference({
            ...preference,
            logoutRequiredOnLaunch: false,
          });
        }

        if (!preference?.rememberMe) {
          return;
        }

        try {
          const refreshedSession = await refreshIdentitySession();
          if (!cancelled) {
            setSession(refreshedSession);
          }
        } catch {
          if (!cancelled) {
            setSession(null);
          }
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthSessionContext.Provider
      value={{
        session,
        isBootstrapping,
        rememberedEmail,
        rememberedPreferenceEnabled,
        setSession,
      }}
    >
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }
  return context;
}
