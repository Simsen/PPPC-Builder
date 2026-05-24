import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';
import { getMsal, getStoredClientId } from './lib/auth/msal';
import { applyTheme, getThemePref } from './lib/theme';

// Apply theme as early as possible to avoid a flash of the wrong color scheme
applyTheme(getThemePref());

/**
 * MSAL must consume the redirect response (URL hash) BEFORE React mounts.
 * If we returned from a sign-in redirect, handleRedirectPromise inside
 * getMsal() will parse the hash and set the active account so the App's
 * mount-hydration sees the signed-in state immediately.
 */
async function bootstrap() {
  if (getStoredClientId()) {
    try {
      await getMsal();
    } catch (err) {
      console.error('MSAL bootstrap failed', err);
    }
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
