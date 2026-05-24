import type { KnownApp } from './types';

interface KnownAppsFile {
  apps: KnownApp[];
}

let cache: KnownApp[] | null = null;
let inflight: Promise<KnownApp[]> | null = null;

/**
 * Fetch the runtime-editable known-apps list from /library/known-apps.json.
 * Cached after first load; falls back to an empty list if the request fails
 * (the app still works — users can upload .zip/.plist manually).
 */
export async function loadKnownApps(): Promise<KnownApp[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}library/known-apps.json`, {
        cache: 'no-cache',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as KnownAppsFile;
      cache = Array.isArray(data.apps) ? data.apps : [];
      return cache;
    } catch (e) {
      console.warn('Failed to load known-apps.json', e);
      cache = [];
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Synchronous accessor — returns the cached list, or [] before load completes. */
export function getKnownAppsSync(): KnownApp[] {
  return cache ?? [];
}
