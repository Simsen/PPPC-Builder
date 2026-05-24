import { getAccessToken } from './auth/msal';
import { GRAPH_HOST } from './auth/scopes';

export interface GraphGroup {
  id: string;
  displayName: string;
  securityEnabled: boolean;
  mailEnabled: boolean;
  groupTypes: string[];
}

export interface AssignmentFilter {
  id: string;
  displayName: string;
  description?: string;
  platform: string;
  assignmentFilterManagementType: string;
}

async function graphFetch(
  path: string,
  init: RequestInit = {},
  version: 'v1.0' | 'beta' = 'beta',
): Promise<unknown> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_HOST}/${version}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new GraphError(res.status, detail);
  }
  // Some Graph endpoints (notably /assign) return 200 with an empty body.
  // Don't blindly call res.json() — read the text and only parse if non-empty.
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class GraphError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`Graph ${status}: ${message}`);
    this.status = status;
    this.name = 'GraphError';
  }
}

/**
 * Search security groups by displayName. Uses $search which requires
 * ConsistencyLevel: eventual. Returns up to 50 matches.
 */
export async function searchGroups(query: string): Promise<GraphGroup[]> {
  const params = new URLSearchParams({
    $select: 'id,displayName,securityEnabled,mailEnabled,groupTypes',
    $filter: 'securityEnabled eq true',
    $top: '50',
    $count: 'true',
  });
  if (query.trim().length > 0) {
    // Escape any double quotes in user input
    const safe = query.replace(/"/g, '');
    params.set('$search', `"displayName:${safe}"`);
  } else {
    params.set('$orderby', 'displayName');
  }
  const token = await getAccessToken();
  const res = await fetch(
    `${GRAPH_HOST}/v1.0/groups?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ConsistencyLevel: 'eventual',
      },
    },
  );
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new GraphError(res.status, detail);
  }
  const data = (await res.json()) as { value: GraphGroup[] };
  return data.value;
}

/** List macOS device-targeted assignment filters. */
export async function listMacAssignmentFilters(): Promise<AssignmentFilter[]> {
  const data = (await graphFetch(
    '/deviceManagement/assignmentFilters?$select=id,displayName,description,platform,assignmentFilterManagementType',
    {},
    'beta',
  )) as { value: AssignmentFilter[] };
  return data.value.filter(
    (f) =>
      f.platform === 'macOS' &&
      f.assignmentFilterManagementType === 'devices',
  );
}

export interface ScopeTag {
  id: string;
  displayName: string;
  description: string;
  isBuiltIn: boolean;
}

/** List Intune role scope tags. The "Default" tag always exists with id="0". */
export async function listScopeTags(): Promise<ScopeTag[]> {
  const data = (await graphFetch(
    '/deviceManagement/roleScopeTags?$select=id,displayName,description,isBuiltIn',
    {},
    'beta',
  )) as { value: ScopeTag[] };
  return data.value;
}

/** Re-exported for use elsewhere. */
export { graphFetch };
