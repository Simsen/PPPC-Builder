import { graphFetch } from './graph';
import { buildAssignmentBody, type AssignmentConfig } from './assignments';
import type { GeneratedProfile } from './types';
import { INTUNE_PORTAL_BASE } from './auth/scopes';

export interface DeployResult {
  profile: GeneratedProfile;
  status: 'created' | 'assigned' | 'failed';
  intuneId?: string;
  portalUrl?: string;
  error?: string;
}

/** Base64-encode a UTF-8 string for the Graph `payload` field. */
export function base64EncodeUtf8(s: string): string {
  // btoa requires Latin-1; encode UTF-8 → bytes → binary string first.
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function portalUrl(id: string, policyName: string, assigned: boolean): string {
  // Working deep link for macOSCustomConfiguration policies. Uses the
  // PolicySummaryReportBlade with policyType=56 (the numeric code for
  // macOSCustomConfiguration in Intune's blade routing).
  const name = encodeURIComponent(policyName);
  return `${INTUNE_PORTAL_BASE}/#view/Microsoft_Intune_DeviceSettings/PolicySummaryReportBlade/policyId/${id}/policyName/${name}/policyJourneyState~/0/policyType~/56/isAssigned~/${assigned ? 'true' : 'false'}`;
}

interface CreatedProfile {
  id: string;
}

/**
 * Create a macOSCustomConfiguration in Intune for a single GeneratedProfile.
 * Returns the new policy's Graph id.
 */
export async function createMacCustomConfig(
  profile: GeneratedProfile,
): Promise<string> {
  const body = {
    '@odata.type': '#microsoft.graph.macOSCustomConfiguration',
    displayName: profile.policyName,
    description: profile.description || '',
    deploymentChannel: profile.deploymentChannel ?? 'deviceChannel',
    payloadName: profile.policyName,
    payloadFileName: profile.filename,
    payload: base64EncodeUtf8(profile.xml),
    roleScopeTagIds:
      profile.scopeTagIds && profile.scopeTagIds.length > 0
        ? profile.scopeTagIds
        : ['0'],
  };
  const result = (await graphFetch(
    '/deviceManagement/deviceConfigurations',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    'beta',
  )) as CreatedProfile;
  return result.id;
}

/** Apply assignment config to a created configuration. */
export async function assignConfig(
  intuneId: string,
  assignment: AssignmentConfig,
): Promise<void> {
  if (assignment.mode === 'none') return;
  const body = buildAssignmentBody(assignment);
  if (body.assignments.length === 0) return;
  await graphFetch(
    `/deviceManagement/deviceConfigurations/${intuneId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    'beta',
  );
}

/**
 * Deploy a list of profiles to Intune. Each profile is created and then,
 * if assignment is configured, assigned. Per-profile assignments allow
 * different targets for different policies. Continues past individual failures.
 */
export async function deployProfiles(
  profiles: GeneratedProfile[],
  assignments: AssignmentConfig[],
  onProgress?: (idx: number, result: DeployResult) => void,
): Promise<DeployResult[]> {
  const out: DeployResult[] = [];
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const assignment = assignments[i] ?? { mode: 'none', groups: [], filter: null };
    try {
      const id = await createMacCustomConfig(p);
      let status: DeployResult['status'] = 'created';
      try {
        await assignConfig(id, assignment);
        if (assignment.mode !== 'none') status = 'assigned';
      } catch (e) {
        const r: DeployResult = {
          profile: p,
          status: 'failed',
          intuneId: id,
          portalUrl: portalUrl(id, p.policyName, false),
          error:
            'Created but assignment failed: ' +
            (e instanceof Error ? e.message : String(e)),
        };
        out.push(r);
        onProgress?.(i, r);
        continue;
      }
      const r: DeployResult = {
        profile: p,
        status,
        intuneId: id,
        portalUrl: portalUrl(id, p.policyName, status === 'assigned'),
      };
      out.push(r);
      onProgress?.(i, r);
    } catch (e) {
      const r: DeployResult = {
        profile: p,
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      };
      out.push(r);
      onProgress?.(i, r);
    }
  }
  return out;
}
