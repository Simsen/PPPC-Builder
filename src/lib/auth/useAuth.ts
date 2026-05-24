import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveAccount,
  getMsal,
  getStoredClientId,
  signIn as msalSignIn,
  signOut as msalSignOut,
} from './msal';

export interface AuthState {
  clientIdConfigured: boolean;
  account: { username: string; name?: string; tenantId?: string } | null;
  busy: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    clientIdConfigured: !!getStoredClientId(),
    account: null,
    busy: false,
    error: null,
  });

  // Hydrate active account on mount (if MSAL has one cached in sessionStorage)
  useEffect(() => {
    const clientId = getStoredClientId();
    if (!clientId) return;
    (async () => {
      try {
        await getMsal();
        const acc = getActiveAccount();
        if (acc) {
          setState((s) => ({
            ...s,
            account: {
              username: acc.username,
              name: acc.name,
              tenantId: acc.tenantId,
            },
          }));
        }
      } catch {
        // ignore; user will see disabled buttons
      }
    })();
  }, []);

  // Single-flight guard: prevents nested popups when multiple buttons race.
  const signInRef = useRef(false);

  const signIn = useCallback(async () => {
    if (signInRef.current) return;
    signInRef.current = true;
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      // Redirect flow: this navigates away. The post-redirect state update
      // happens in the mount-hydration effect after the user returns.
      await msalSignIn();
    } catch (e) {
      setState((s) => ({
        ...s,
        busy: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      signInRef.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      await msalSignOut();
      setState((s) => ({ ...s, busy: false, account: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        busy: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  const refreshClientIdConfigured = useCallback(() => {
    setState((s) => ({ ...s, clientIdConfigured: !!getStoredClientId() }));
  }, []);

  return { state, signIn, signOut, refreshClientIdConfigured };
}
