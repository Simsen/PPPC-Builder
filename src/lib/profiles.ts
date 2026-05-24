import { generateMobileconfig } from './mobileconfig';
import { generateRandomUUID } from './uuid';
import { safeFilename, totalEnabledPermissions } from './state';
import type {
  GeneratedProfile,
  OutputMode,
  ProfileSettings,
  SelectedApp,
} from './types';

/**
 * Generate one or more .mobileconfig profiles depending on output mode.
 *
 * - 'bundle' : single profile containing all enabled apps (default v2 behavior)
 * - 'separate': one profile per app — each uses the app's per-app profile metadata
 *               with org/description falling back to the shared ProfileSettings
 */
export function generateProfiles(
  apps: SelectedApp[],
  shared: ProfileSettings,
  mode: OutputMode,
  innerUUID?: string,
): GeneratedProfile[] {
  if (totalEnabledPermissions(apps) === 0) return [];

  if (mode === 'bundle') {
    const xml = generateMobileconfig(apps, shared, innerUUID);
    const appSegment = apps
      .map((a) => a.app.bundleId.split('.').pop())
      .filter(Boolean)
      .join('-');
    const baseName = shared.payloadName || `PPPC-${appSegment || 'profile'}`;
    return [
      {
        filename: `${safeFilename(baseName)}.mobileconfig`,
        policyName: shared.payloadName || `PPPC Configuration`,
        description: shared.payloadDescription,
        xml,
        scopeTagIds: shared.scopeTagIds.length > 0 ? shared.scopeTagIds : ['0'],
        deploymentChannel: shared.deploymentChannel,
      },
    ];
  }

  // Separate: one profile per app that has at least one enabled permission.
  const out: GeneratedProfile[] = [];
  for (const app of apps) {
    if (totalEnabledPermissions([app]) === 0) continue;
    const perAppSettings: ProfileSettings = {
      organization: app.profile.organization || shared.organization,
      payloadName: app.profile.name || `PPPC - ${app.app.displayName}`,
      payloadIdentifier: app.profile.identifier,
      payloadDescription: app.profile.description || shared.payloadDescription,
      scopeTagIds: app.scopeTagIds,
      deploymentChannel: app.deploymentChannel,
    };
    const xml = generateMobileconfig([app], perAppSettings, generateRandomUUID());
    out.push({
      filename: `${safeFilename(perAppSettings.payloadName)}.mobileconfig`,
      policyName: perAppSettings.payloadName,
      description: perAppSettings.payloadDescription,
      xml,
      bundleId: app.app.bundleId,
      scopeTagIds: app.scopeTagIds.length > 0 ? app.scopeTagIds : ['0'],
      deploymentChannel: app.deploymentChannel,
    });
  }
  return out;
}
