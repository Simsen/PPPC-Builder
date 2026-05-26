import {
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
  InteractionRequiredAuthError,
  BrowserAuthError,
} from '@azure/msal-browser';
import { GRAPH_SCOPES } from './scopes';

/** Clear ONLY the MSAL "interaction in progress" flag.
 *  Do NOT touch request.params/request.state/nonce keys — MSAL needs those to
 *  validate the popup response when it comes back. Clearing them is what was
 *  silently breaking sign-in. */
function clearStaleInteraction(): void {
  try {
    const remove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      if (key.startsWith('msal.') && key.includes('interaction.status')) {
        remove.push(key);
      }
    }
    for (const k of remove) sessionStorage.removeItem(k);
  } catch {
    // ignore — sessionStorage may be unavailable in some contexts
  }
}

const CLIENT_ID_KEY = 'pppc.intuneClientId';
const TENANT_ID_KEY = 'pppc.intuneTenantId';

/** Built-in default Client ID, baked at build time. Empty string disables it. */
const BUILTIN_CLIENT_ID = (import.meta.env.VITE_AZURE_CLIENT_ID ?? '').trim();
const BUILTIN_TENANT_ID = (import.meta.env.VITE_AZURE_TENANT_ID ?? 'organizations').trim();

/**
 * Resolve the active Client ID.
 *  1. VITE_AZURE_CLIENT_ID env var — always wins when set.
 *  2. localStorage override — only consulted for self-hosted builds that
 *     ship without a baked-in Client ID.
 *
 * When the env var is set, any leftover localStorage values are cleared
 * defensively so a stale override can't break sign-in.
 */
export function getStoredClientId(): string {
  if (BUILTIN_CLIENT_ID) {
    if (
      localStorage.getItem(CLIENT_ID_KEY) ||
      localStorage.getItem(TENANT_ID_KEY)
    ) {
      localStorage.removeItem(CLIENT_ID_KEY);
      localStorage.removeItem(TENANT_ID_KEY);
    }
    return BUILTIN_CLIENT_ID;
  }
  const override = localStorage.getItem(CLIENT_ID_KEY);
  return (override && override.trim()) || '';
}

export function getStoredTenantId(): string {
  if (BUILTIN_CLIENT_ID) return BUILTIN_TENANT_ID || 'organizations';
  const override = localStorage.getItem(TENANT_ID_KEY);
  return (override && override.trim()) || BUILTIN_TENANT_ID || 'organizations';
}

let instance: PublicClientApplication | null = null;
let initialized = false;

function buildConfig(clientId: string, tenantId: string): Configuration {
  // Use the full URL including Vite base path so the redirect URI matches the
  // one registered in the Entra app reg. On GitHub Pages project pages this
  // becomes e.g. https://user.github.io/repo-name/.
  const redirect = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: redirect,
      postLogoutRedirectUri: redirect,
    },
    cache: {
      // localStorage persists tokens across the Microsoft redirect round-trip
      // and across tabs/reloads. Tokens are short-lived (1h access; refresh
      // tokens auto-rotate) and are cleared by Sign out.
      cacheLocation: 'localStorage',
    },
  };
}

export async function getMsal(): Promise<PublicClientApplication> {
  const clientId = getStoredClientId();
  if (!clientId) throw new Error('No Intune Client ID configured');

  // Recreate when client/tenant changes
  const tenantId = getStoredTenantId();
  const expectedClient = instance?.getConfiguration().auth.clientId;
  const expectedAuthority = instance?.getConfiguration().auth.authority;
  const wantAuthority = `https://login.microsoftonline.com/${tenantId}`;
  if (!instance || expectedClient !== clientId || expectedAuthority !== wantAuthority) {
    instance = new PublicClientApplication(buildConfig(clientId, tenantId));
    initialized = false;
  }
  if (!initialized) {
    await instance.initialize();
    // Consume the response from a redirect sign-in. When the user returns
    // from Microsoft, the URL hash holds the auth code; handleRedirectPromise
    // parses it and returns the AuthenticationResult. We then mark that
    // account as active so getActiveAccount() reflects the new sign-in.
    const result = await instance.handleRedirectPromise();
    if (result?.account) {
      instance.setActiveAccount(result.account);
    }
    initialized = true;
  }
  return instance;
}

export function getActiveAccount(): AccountInfo | null {
  if (!instance) return null;
  return instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? null;
}

/**
 * Begin sign-in via full-page redirect to Microsoft. The current page is
 * abandoned; after auth the user returns to `redirectUri` (this app) and
 * main.tsx's bootstrap consumes the response via handleRedirectPromise().
 *
 * Returns a never-resolving promise from the caller's perspective — the
 * page navigates away before it could resolve.
 */
export async function signIn(): Promise<void> {
  const msal = await getMsal();
  try {
    await msal.loginRedirect({
      scopes: GRAPH_SCOPES,
      prompt: 'select_account',
    });
  } catch (e) {
    if (
      e instanceof BrowserAuthError &&
      e.errorCode === 'interaction_in_progress'
    ) {
      clearStaleInteraction();
      await msal.loginRedirect({
        scopes: GRAPH_SCOPES,
        prompt: 'select_account',
      });
      return;
    }
    throw e;
  }
}

export async function signOut(): Promise<void> {
  if (!instance) return;
  const account = getActiveAccount();
  await instance.logoutRedirect({
    account: account ?? undefined,
  });
}

export async function getAccessToken(): Promise<string> {
  const msal = await getMsal();
  const account = getActiveAccount();
  if (!account) throw new Error('Not signed in');
  try {
    const result = await msal.acquireTokenSilent({
      scopes: GRAPH_SCOPES,
      account,
    });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      // Silent failed — fall back to a redirect (full page navigation).
      await msal.acquireTokenRedirect({ scopes: GRAPH_SCOPES, account });
      // The page will navigate away; no return value reachable.
      throw new Error('Redirecting for interactive token…');
    }
    throw e;
  }
}
