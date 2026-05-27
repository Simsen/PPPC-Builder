import { generateMobileconfig } from './mobileconfig';
import {
  buildSettingsCatalogPolicy,
  serializeSettingsCatalogPolicy,
} from './settingsCatalog';
import { generateRandomUUID } from './uuid';
import { safeFilename, totalEnabledPermissions } from './state';
import type {
  DeploymentFormat,
  GeneratedProfile,
  OutputMode,
  ProfileSettings,
  SelectedApp,
} from './types';

/**
 * Returns null when no services would be emitted — e.g. all permissions disabled,
 * or only AppleEvents enabled with zero receivers. Caller is expected to skip
 * the profile in that case rather than emit empty content (which would crash
 * the JSON.parse path in deploy.ts and produce a misleading empty .mobileconfig).
 */
function buildContent(
  apps: SelectedApp[],
  settings: ProfileSettings,
  format: DeploymentFormat,
  innerUUID?: string,
): { content: string; ext: 'mobileconfig' | 'json' } | null {
  if (format === 'classic') {
    const content = generateMobileconfig(apps, settings, innerUUID);
    return content ? { content, ext: 'mobileconfig' } : null;
  }
  const policy = buildSettingsCatalogPolicy(apps, settings);
  return policy
    ? { content: serializeSettingsCatalogPolicy(policy), ext: 'json' }
    : null;
}

/**
 * Generate one or more deployment profiles depending on output mode and format.
 *
 * Output mode controls how many profiles are produced:
 *   - 'bundle'   : single profile containing all enabled apps
 *   - 'separate' : one profile per app, using each app's per-app metadata
 *
 * Deployment format controls the serialization shape:
 *   - 'classic'         : `.mobileconfig` plist for macOSCustomConfiguration
 *   - 'settingsCatalog' : JSON for the configurationPolicies Settings Catalog API
 */
export function generateProfiles(
  apps: SelectedApp[],
  shared: ProfileSettings,
  mode: OutputMode,
  format: DeploymentFormat,
  innerUUID?: string,
): GeneratedProfile[] {
  if (totalEnabledPermissions(apps) === 0) return [];

  if (mode === 'bundle') {
    const built = buildContent(apps, shared, format, innerUUID);
    if (!built) return [];
    const appSegment = apps
      .map((a) => a.app.bundleId.split('.').pop())
      .filter(Boolean)
      .join('-');
    const baseName = shared.payloadName || `PPPC-${appSegment || 'profile'}`;
    return [
      {
        filename: `${safeFilename(baseName)}.${built.ext}`,
        policyName: shared.payloadName || `PPPC Configuration`,
        description: shared.payloadDescription,
        content: built.content,
        format,
        scopeTagIds: shared.scopeTagIds.length > 0 ? shared.scopeTagIds : ['0'],
        deploymentChannel: shared.deploymentChannel,
      },
    ];
  }

  // Separate: one profile per app that has at least one enabled permission
  // AND would actually emit at least one service entry (AppleEvents with no
  // receivers, for instance, is "enabled" but emits nothing).
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
    const built = buildContent(
      [app],
      perAppSettings,
      format,
      generateRandomUUID(),
    );
    if (!built) continue;
    out.push({
      filename: `${safeFilename(perAppSettings.payloadName)}.${built.ext}`,
      policyName: perAppSettings.payloadName,
      description: perAppSettings.payloadDescription,
      content: built.content,
      format,
      bundleId: app.app.bundleId,
      scopeTagIds: app.scopeTagIds.length > 0 ? app.scopeTagIds : ['0'],
      deploymentChannel: app.deploymentChannel,
    });
  }
  return out;
}
