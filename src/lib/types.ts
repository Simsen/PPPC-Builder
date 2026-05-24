export type Authorization = 'Allow' | 'AllowStandardUserToSetSystemService' | 'Deny';

export type DeploymentChannel = 'deviceChannel' | 'userChannel';

export interface PppcPermission {
  id: string;
  name: string;
  description: string;
  tccService: string;
  canForceAllow: boolean;
  tooltip?: string;
}

export interface KnownApp {
  bundleId: string;
  displayName: string;
  codeRequirement: string;
}

export interface AppInfo {
  bundleId: string;
  displayName: string;
  codeRequirement: string | null;
}

export interface PermissionState {
  enabled: boolean;
  authorization: Authorization;
}

export type PermissionsState = Record<string, PermissionState>;

export interface SelectedApp {
  id: number;
  app: AppInfo;
  permissions: PermissionsState;
  expanded: boolean;
  isKnownApp: boolean;
  /** Per-app profile metadata. Used in 'separate' output mode; ignored in 'bundle' mode. */
  profile: {
    name: string;
    description: string;
    identifier: string;
    organization: string;
  };
  /** Intune scope tag IDs to apply on deploy (separate mode). Defaults to ["0"] (Default). */
  scopeTagIds: string[];
  /** Intune deployment channel for this profile. Defaults to 'deviceChannel'. */
  deploymentChannel: DeploymentChannel;
}

export interface ProfileSettings {
  organization: string;
  payloadName: string;
  payloadIdentifier: string;
  payloadDescription: string;
  /** Intune scope tag IDs for the bundled policy. Defaults to ["0"] (Default). */
  scopeTagIds: string[];
  /** Intune deployment channel for the bundled policy. */
  deploymentChannel: DeploymentChannel;
}

export type OutputMode = 'bundle' | 'separate';

export interface GeneratedProfile {
  filename: string;
  policyName: string;
  description: string;
  xml: string;
  /** When mode === 'separate', the bundleId of the single app this profile is for. */
  bundleId?: string;
  /** Intune scope tag IDs to set on the policy when deployed. */
  scopeTagIds: string[];
  /** Intune deployment channel ('deviceChannel' or 'userChannel'). */
  deploymentChannel: DeploymentChannel;
}
