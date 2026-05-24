import { PPPC_PERMISSIONS } from './permissions';
import { escapeXml } from './xml';
import { generateRandomUUID } from './uuid';
import type { ProfileSettings, SelectedApp } from './types';

interface ServiceEntry {
  bundleId: string;
  codeRequirement: string | null;
  authorization: string;
  canForceAllow: boolean;
}

/**
 * Build the inner Services-dict XML body from the selected apps' enabled permissions.
 * Returns null when no permissions are enabled (caller emits an empty profile).
 * Output indentation and field ordering match v2 byte-for-byte.
 */
function buildServicesDict(selectedApps: SelectedApp[]): string | null {
  const serviceGroups: Record<string, ServiceEntry[]> = {};

  for (const item of selectedApps) {
    for (const [permId, state] of Object.entries(item.permissions)) {
      if (!state.enabled) continue;
      const perm = PPPC_PERMISSIONS.find((p) => p.id === permId);
      if (!perm) continue;
      const service = perm.tccService;
      if (!serviceGroups[service]) serviceGroups[service] = [];
      serviceGroups[service].push({
        bundleId: item.app.bundleId,
        codeRequirement: item.app.codeRequirement,
        authorization: state.authorization,
        canForceAllow: perm.canForceAllow,
      });
    }
  }

  if (Object.keys(serviceGroups).length === 0) return null;

  return Object.entries(serviceGroups)
    .map(([service, apps]) => {
      const appsXml = apps
        .map(({ bundleId, codeRequirement, authorization, canForceAllow }) => {
          const codeReq =
            codeRequirement || `identifier "${bundleId}" and anchor apple generic`;
          const auth = canForceAllow ? authorization : 'AllowStandardUserToSetSystemService';
          return `                    <dict>
                        <key>Authorization</key>
                        <string>${auth}</string>
                        <key>CodeRequirement</key>
                        <string>${escapeXml(codeReq)}</string>
                        <key>Comment</key>
                        <string></string>
                        <key>Identifier</key>
                        <string>${escapeXml(bundleId)}</string>
                        <key>IdentifierType</key>
                        <string>bundleID</string>
                    </dict>`;
        })
        .join('\n');

      return `                <key>${service}</key>
                <array>
${appsXml}
                </array>`;
    })
    .join('\n');
}

function emptyProfile(name: string, org: string, desc: string, uuid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array/>
    <key>PayloadDescription</key>
    <string>${escapeXml(desc)}</string>
    <key>PayloadDisplayName</key>
    <string>${escapeXml(name)}</string>
    <key>PayloadIdentifier</key>
    <string>${uuid}</string>
    <key>PayloadOrganization</key>
    <string>${escapeXml(org)}</string>
    <key>PayloadScope</key>
    <string>System</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
}

/**
 * Generate a complete .mobileconfig XML string.
 * Byte-equivalent with v2 generateMobileconfig() for identical inputs (same UUIDs).
 */
export function generateMobileconfig(
  selectedApps: SelectedApp[],
  settings: ProfileSettings,
  innerPayloadUUID?: string,
): string {
  const profileName = settings.payloadName || 'PPPC Configuration';
  const organization = settings.organization || 'IT Department';
  const description = settings.payloadDescription || '';
  const profileUUID = settings.payloadIdentifier || generateRandomUUID();

  const servicesContent = buildServicesDict(selectedApps);
  if (!servicesContent) {
    return emptyProfile(profileName, organization, description, profileUUID);
  }

  const inner = innerPayloadUUID ?? generateRandomUUID();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadDescription</key>
            <string>${escapeXml(profileName)}</string>
            <key>PayloadDisplayName</key>
            <string>${escapeXml(profileName)}</string>
            <key>PayloadIdentifier</key>
            <string>${inner}</string>
            <key>PayloadOrganization</key>
            <string>${escapeXml(organization)}</string>
            <key>PayloadType</key>
            <string>com.apple.TCC.configuration-profile-policy</string>
            <key>PayloadUUID</key>
            <string>${inner}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Services</key>
            <dict>
${servicesContent}
            </dict>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>${escapeXml(description)}</string>
    <key>PayloadDisplayName</key>
    <string>${escapeXml(profileName)}</string>
    <key>PayloadIdentifier</key>
    <string>${profileUUID}</string>
    <key>PayloadOrganization</key>
    <string>${escapeXml(organization)}</string>
    <key>PayloadScope</key>
    <string>System</string>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${profileUUID}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;
}
