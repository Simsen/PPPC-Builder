/** Graph permissions required for Intune deployment + assignment.
 *  ReadWrite.All implies Read.All — don't request both. */
export const GRAPH_SCOPES = [
  'DeviceManagementConfiguration.ReadWrite.All',
  'DeviceManagementRBAC.Read.All',
  'Group.Read.All',
  'User.Read',
];

/** Default Microsoft Graph host. */
export const GRAPH_HOST = 'https://graph.microsoft.com';

/** Intune portal deep-link base. */
export const INTUNE_PORTAL_BASE = 'https://intune.microsoft.com';
