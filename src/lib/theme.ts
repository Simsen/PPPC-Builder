/**
 * Theme handling: defaults to OS preference, allows manual override stored in
 * localStorage. Apply once at startup before React renders to avoid FOUC.
 */

export type ThemePref = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'pppc.theme';

function osPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function getThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'auto') return v;
  return 'auto';
}

export function setThemePref(pref: ThemePref) {
  if (pref === 'auto') localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'auto') return osPrefersDark() ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePref) {
  const resolved = resolveTheme(pref);
  const html = document.documentElement;
  html.classList.toggle('dark', resolved === 'dark');
}

/**
 * Subscribe to OS-level theme changes. Calls the handler whenever the user
 * is on 'auto' and the OS preference flips. Returns an unsubscribe fn.
 */
export function watchOsTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
