// Byte-equivalence check: confirm v3 generator output matches v2.
//
// Strategy: load legacy/app.js in a stubbed sandbox, run the v2
// generateMobileconfig() function, then call the v3 TS module with the same
// inputs and the same injected UUIDs. Diff the two strings.
//
// Run: npx tsx scripts/verify-equivalence.mts

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { generateMobileconfig } from '../src/lib/mobileconfig';
import type { SelectedApp, ProfileSettings } from '../src/lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// --- Load v2 in a sandbox ---------------------------------------------------
// Rewrite `let`/`const` top-level state declarations to `var` so the test
// can set them via the sandbox. Only affects the in-test copy of v2.
const legacySource = readFileSync(join(repoRoot, 'legacy/app.js'), 'utf8')
  .replace(/^let /gm, 'var ')
  .replace(/^const /gm, 'var ');

const noop = () => {};
const stubEl = () => ({
  addEventListener: noop,
  classList: { add: noop, remove: noop, contains: () => false, toggle: noop },
  appendChild: noop,
  removeChild: noop,
  querySelector: () => null,
  querySelectorAll: () => [],
  setAttribute: noop,
  removeAttribute: noop,
  focus: noop,
  click: noop,
  style: {},
  dataset: {},
  innerHTML: '',
  textContent: '',
  value: '',
  checked: false,
  disabled: false,
  hidden: false,
  children: [],
});

const sandbox: Record<string, unknown> = {
  document: {
    getElementById: stubEl,
    querySelector: stubEl,
    querySelectorAll: () => [],
    createElement: stubEl,
    addEventListener: noop,
    body: stubEl(),
  },
  window: {},
  navigator: { clipboard: undefined },
  console,
  setTimeout: () => 0 as unknown as ReturnType<typeof setTimeout>,
  clearTimeout: noop,
  Math,
  Date,
  JSON,
  Object,
  Array,
  DOMParser: class {
    parseFromString() {
      return { querySelector: () => null };
    }
  },
};
vm.createContext(sandbox);
vm.runInContext(legacySource, sandbox);

// --- Fixtures ---------------------------------------------------------------
const innerUUID = '11111111-2222-4333-8444-555555555555';
const profileUUID = 'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE';

const teamsApp: SelectedApp = {
  id: 1,
  app: {
    bundleId: 'com.microsoft.teams',
    displayName: 'Microsoft Teams',
    codeRequirement:
      'identifier "com.microsoft.teams" and anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] /* exists */ and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */ and certificate leaf[subject.OU] = UBF8T346G9',
  },
  permissions: {
    accessibility: { enabled: true, authorization: 'Allow' },
    fullDiskAccess: { enabled: true, authorization: 'Allow' },
    screenRecording: { enabled: true, authorization: 'Allow' },
    microphone: { enabled: false, authorization: 'AllowStandardUserToSetSystemService' },
    camera: { enabled: false, authorization: 'AllowStandardUserToSetSystemService' },
  },
  expanded: true,
  isKnownApp: true,
};

const zoomApp: SelectedApp = {
  id: 2,
  app: {
    bundleId: 'us.zoom.xos',
    displayName: 'Zoom',
    codeRequirement:
      'identifier "us.zoom.xos" and anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] /* exists */ and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */ and certificate leaf[subject.OU] = BJ4HAAB9B3',
  },
  permissions: {
    microphone: { enabled: true, authorization: 'AllowStandardUserToSetSystemService' },
    camera: { enabled: true, authorization: 'Allow' /* should be overridden to AllowStandardUser */ },
    screenRecording: { enabled: true, authorization: 'AllowStandardUserToSetSystemService' },
  },
  expanded: true,
  isKnownApp: true,
};

const customApp: SelectedApp = {
  id: 3,
  app: {
    bundleId: 'com.example.weird & app',
    displayName: 'Weird <App>',
    codeRequirement: null,
  },
  permissions: {
    automation: { enabled: true, authorization: 'Deny' },
  },
  expanded: false,
  isKnownApp: false,
};

const baseSettings: ProfileSettings = {
  organization: 'Contoso IT',
  payloadName: 'PPPC - Microsoft Teams',
  payloadIdentifier: profileUUID,
  payloadDescription: 'Test profile <special> & chars',
};

type Case = {
  name: string;
  apps: SelectedApp[];
  settings: ProfileSettings;
};

const cases: Case[] = [
  { name: 'single known app, 3 perms', apps: [teamsApp], settings: baseSettings },
  {
    name: 'multi-app + canForceAllow=false override',
    apps: [teamsApp, zoomApp],
    settings: baseSettings,
  },
  {
    name: 'custom app w/ XML-unsafe chars, no codeRequirement',
    apps: [customApp],
    settings: baseSettings,
  },
  {
    name: 'no permissions enabled (empty profile path)',
    apps: [
      {
        ...teamsApp,
        permissions: {
          accessibility: { enabled: false, authorization: 'Allow' },
        },
      },
    ],
    settings: baseSettings,
  },
  {
    name: 'empty selectedApps array',
    apps: [],
    settings: baseSettings,
  },
];

function runV2(apps: SelectedApp[], settings: ProfileSettings): string {
  sandbox.selectedApps = apps;
  sandbox.profileOrganization = settings.organization;
  sandbox.profilePayloadName = settings.payloadName;
  sandbox.profilePayloadIdentifier = settings.payloadIdentifier;
  sandbox.profilePayloadDescription = settings.payloadDescription;
  sandbox.generateRandomUUID = () => innerUUID;
  return vm.runInContext('generateMobileconfig()', sandbox) as string;
}

let failed = 0;
for (const c of cases) {
  const v2Out = runV2(c.apps, c.settings);
  const v3Out = generateMobileconfig(c.apps, c.settings, innerUUID);
  if (v2Out === v3Out) {
    console.log(`OK   ${c.name} (${v2Out.length} bytes)`);
    continue;
  }
  failed++;
  console.log(`FAIL ${c.name}`);
  const v2Lines = v2Out.split('\n');
  const v3Lines = v3Out.split('\n');
  for (let i = 0; i < Math.max(v2Lines.length, v3Lines.length); i++) {
    if (v2Lines[i] !== v3Lines[i]) {
      console.log(`  line ${i + 1}:`);
      console.log(`    v2: ${JSON.stringify(v2Lines[i])}`);
      console.log(`    v3: ${JSON.stringify(v3Lines[i])}`);
      break;
    }
  }
}

if (failed > 0) {
  console.log(`\n${failed} case(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${cases.length} cases byte-identical.`);
