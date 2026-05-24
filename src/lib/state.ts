import { PPPC_PERMISSIONS } from './permissions';
import { KNOWN_APPS } from './knownApps';
import { generateRandomUUID } from './uuid';
import type {
  AppInfo,
  PermissionsState,
  SelectedApp,
} from './types';

export function createDefaultPermissions(): PermissionsState {
  const perms: PermissionsState = {};
  for (const p of PPPC_PERMISSIONS) {
    perms[p.id] = {
      enabled: false,
      authorization: 'Allow',
    };
  }
  return perms;
}

export function makeAppEntry(
  appInfo: AppInfo,
  id: number,
  isFirst: boolean,
  isKnownAppArg?: boolean,
): SelectedApp {
  return {
    id,
    app: appInfo,
    permissions: createDefaultPermissions(),
    expanded: isFirst,
    isKnownApp:
      isKnownAppArg ?? KNOWN_APPS.some((a) => a.bundleId === appInfo.bundleId),
    profile: {
      name: `PPPC - ${appInfo.displayName}`,
      description: '',
      identifier: generateRandomUUID(),
      organization: '',
    },
    scopeTagIds: ['0'],
    deploymentChannel: 'deviceChannel',
  };
}

/** Sanitize a string into something safe for use as a filename. */
export function safeFilename(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function totalEnabledPermissions(apps: SelectedApp[]): number {
  return apps.reduce(
    (sum, item) =>
      sum + Object.values(item.permissions).filter((p) => p.enabled).length,
    0,
  );
}
