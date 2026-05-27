import { graphFetch } from './graph';
import { buildAssignmentBody, type AssignmentConfig } from './assignments';
import type { DeploymentFormat, GeneratedProfile } from './types';
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

function classicPortalUrl(id: string, policyName: string, assigned: boolean): string {
  // Working deep link for macOSCustomConfiguration policies. Uses the
  // PolicySummaryReportBlade with policyType=56 (the numeric code for
  // macOSCustomConfiguration in Intune's blade routing).
  const name = encodeURIComponent(policyName);
  return `${INTUNE_PORTAL_BASE}/#view/Microsoft_Intune_DeviceSettings/PolicySummaryReportBlade/policyId/${id}/policyName/${name}/policyJourneyState~/0/policyType~/56/isAssigned~/${assigned ? 'true' : 'false'}`;
}

function settingsCatalogPortalUrl(id: string, assigned: boolean): string {
  // Working deep link for Settings Catalog (configurationPolicies) policies
  // on macOS, routed through Microsoft_Intune_Workflows' PolicySummaryBlade.
  // `technology` matches what we POST as the policy's `technologies` value;
  // the comma must be URL-encoded.
  return `${INTUNE_PORTAL_BASE}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${id}/isAssigned~/${assigned ? 'true' : 'false'}/technology/mdm%2CappleRemoteManagement/templateId//platformName/macOS`;
}

function portalUrl(
  format: DeploymentFormat,
  id: string,
  policyName: string,
  assigned: boolean,
): string {
  return format === 'classic'
    ? classicPortalUrl(id, policyName, assigned)
    : settingsCatalogPortalUrl(id, assigned);
}

interface CreatedProfile {
  id: string;
}

/**
 * Create a macOSCustomConfiguration in Intune for a single classic profile.
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
    payload: base64EncodeUtf8(profile.content),
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

/**
 * Create a Settings Catalog configurationPolicy in Intune for a single profile.
 * The `content` field of the profile already contains the JSON-encoded body for
 * the Settings Catalog API; we parse it and post the parsed object directly so
 * Graph can validate against its schema.
 */
export async function createSettingsCatalogPolicy(
  profile: GeneratedProfile,
): Promise<string> {
  const body = JSON.parse(profile.content) as Record<string, unknown>;
  // Override the name/description fields from the live profile metadata in case
  // the user renamed at the deploy step.
  body.name = profile.policyName;
  body.description = profile.description || '';
  body.roleScopeTagIds =
    profile.scopeTagIds && profile.scopeTagIds.length > 0 ? profile.scopeTagIds : ['0'];
  const result = (await graphFetch(
    '/deviceManagement/configurationPolicies',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    'beta',
  )) as CreatedProfile;
  return result.id;
}

/** Apply assignment config to a created macOSCustomConfiguration. */
export async function assignClassic(
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

/** Apply assignment config to a created configurationPolicy (Settings Catalog). */
export async function assignSettingsCatalog(
  intuneId: string,
  assignment: AssignmentConfig,
): Promise<void> {
  if (assignment.mode === 'none') return;
  const classic = buildAssignmentBody(assignment);
  if (classic.assignments.length === 0) return;
  // Settings Catalog rejects the legacy `#microsoft.graph.deviceConfigurationAssignment`
  // wrapper. The configurationPolicies/{id}/assign endpoint accepts a plain
  // `{ assignments: [{ target: {...} }] }` shape.
  const stripped = classic.assignments.map((a) => ({ target: a.target }));
  await graphFetch(
    `/deviceManagement/configurationPolicies/${intuneId}/assign`,
    {
      method: 'POST',
      body: JSON.stringify({ assignments: stripped }),
    },
    'beta',
  );
}

/**
 * Deploy a list of profiles to Intune. Each profile is created and then,
 * if assignment is configured, assigned. Per-profile assignments allow
 * different targets for different policies. Continues past individual failures.
 *
 * Each profile carries its own `format` and is routed accordingly:
 *   - 'classic'         → POST /deviceConfigurations         (macOSCustomConfiguration)
 *   - 'settingsCatalog' → POST /configurationPolicies        (Settings Catalog)
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
      const id =
        p.format === 'settingsCatalog'
          ? await createSettingsCatalogPolicy(p)
          : await createMacCustomConfig(p);
      let status: DeployResult['status'] = 'created';
      try {
        if (p.format === 'settingsCatalog') {
          await assignSettingsCatalog(id, assignment);
        } else {
          await assignClassic(id, assignment);
        }
        if (assignment.mode !== 'none') status = 'assigned';
      } catch (e) {
        const r: DeployResult = {
          profile: p,
          status: 'failed',
          intuneId: id,
          portalUrl: portalUrl(p.format, id, p.policyName, false),
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
        portalUrl: portalUrl(p.format, id, p.policyName, status === 'assigned'),
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
