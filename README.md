# PPPC Builder

Generate macOS **Privacy Preferences Policy Control (PPPC)** `.mobileconfig`
profiles and deploy them straight to **Microsoft Intune** — all from the
browser. No Jamf, no manual XML, no per-user downloads.

A 100% client-side React app. Profiles are generated in your browser;
Intune deployment happens directly between your browser and Microsoft Graph
using your own Entra ID sign-in.

---

## What it does

- **Build** a `.mobileconfig` that grants/denies macOS privacy permissions
  (Accessibility, Full Disk Access, Screen Recording, Microphone, Camera,
  Automation/Apple Events, Contacts, Calendars, Photos, Bluetooth, Removable
  Volumes) for one or more apps.
- **Auto-fills** the designated code requirement for known apps (Teams, Zoom,
  Edge, Chrome, Slack). Upload an `Info.plist` or zipped `.app` to add any
  other app.
- Apply Apple's MDM rules automatically: permissions that Apple won't let MDM
  force (Screen Recording, Microphone, Camera) are locked to
  *Allow standard user to enable*.
- **Output one bundled profile** (all apps in one `.mobileconfig`), **or one
  profile per app** (downloaded as a ZIP, deployed as separate Intune
  policies).
- **Deploy directly to Intune** via Microsoft Graph: creates one
  `macOSCustomConfiguration` per profile, with your choice of scope tags,
  deployment channel, and assignment (no assignment / all users / all
  devices / groups with include/exclude + per-group assignment filters).

---

## How it works

The whole app is one page in two steps:

### Step 1 — Build profiles

1. **Add apps** — drag-and-drop a `.zip` of an `.app` bundle, drop an
   `Info.plist` directly, or pick from the built-in known-apps list.
2. **Toggle permissions** per app. The authorization dropdown (Allow / Allow
   standard user / Deny) is constrained by Apple's rules.
3. **Pick output mode** — *Single bundle* (one `.mobileconfig` covering all
   apps, default) or *Separate profiles* (one per app, with per-app metadata).
4. The right rail shows a **live XML preview** with syntax highlighting and
   an optional word-wrap. Multiple profiles appear as collapsible accordions,
   collapsed by default so the Deploy step is one scroll away.

### Step 2 — Deploy to Intune

1. **Sign in** with Entra ID (top-right button). MSAL handles the redirect;
   tokens stay in your browser.
2. **Name each policy** — bundle mode = one row, separate mode = one row per
   app plus an optional bulk-rename pattern (`{appName}`, `{bundleId}`).
3. Pick **scope tags** (multi-select, defaults to *Default*) and the
   **deployment channel** (device or user) per policy.
4. Configure **assignment per policy** — none, all users, all devices, or
   groups (include/exclude). Each include group can have its own assignment
   filter. *Copy to all* mirrors one policy's assignment onto every other.
5. Click **Deploy** — each policy is created via `POST
   /beta/deviceManagement/deviceConfigurations` and assigned via `POST
   .../assign`. Results appear in-line with deep links to the Intune portal.

### Or just download

If you don't want to give the tool access to your tenant, the Download
button gives you the same `.mobileconfig` (or a ZIP for separate mode) ready
for manual upload to Intune Custom Configuration profiles.

---

## Security & privacy

- **100% client-side.** The Vite-built static bundle runs entirely in your
  browser. No backend, no analytics, no telemetry, no proxy.
- **MSAL tokens** live in `localStorage` so they survive the
  Microsoft redirect round-trip and persist across tabs and reloads.
  Sign out clears them. They're never sent to any server other than
  Microsoft.
- **Graph calls go direct** from your browser to `graph.microsoft.com`.
- **No Client Secret** — the app uses the SPA + PKCE OAuth flow. Only your
  Entra app's *public* Client ID is in the build.

---

## Required Entra permissions

The app requests these **delegated** scopes on sign-in:

| Scope | Why |
|---|---|
| `DeviceManagementConfiguration.ReadWrite.All` | Create / update device configuration profiles |
| `DeviceManagementRBAC.Read.All` | Read scope tag list |
| `Group.Read.All` | Search security groups for assignment |
| `User.Read` | Show your name in the top bar |

All four require admin consent at first use in your tenant.

---

## Local development

```bash
npm install
cp .env.example .env.local        # paste your Entra Client ID
npm run dev                       # http://localhost:5173
```

The local dev server uses `VITE_AZURE_CLIENT_ID` from `.env.local` (or any
shell env). The Entra app reg must include `http://localhost:5173/` as an
SPA redirect URI.

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | TS type-check without emit |
| `npx tsx scripts/verify-equivalence.mts` | Regression test — confirms the generator's XML output stays byte-identical to the legacy v2 generator across 5 fixture cases |

---

## Deploying to GitHub Pages

The repo ships with `.github/workflows/deploy.yml` — push to `main` and a
fresh build is deployed to GitHub Pages.

**One-time setup:**

1. **Repo Settings → Pages**: Source = *GitHub Actions*.
2. **Repo Settings → Secrets and variables → Actions** → *Repository
   secrets*:
   - `AZURE_CLIENT_ID` = your Entra app's Application (client) ID
   - (Optional) `AZURE_TENANT_ID` = a specific tenant ID. Omit to keep the
     default (`organizations`, any work/school tenant).
3. (Optional) **Variables tab** → `BASE_PATH = "/"` if you publish to a
   user/org page (`username.github.io`) or a custom domain. Defaults to
   `/{repo-name}/` for project pages.
4. **Entra app registration → Authentication → Single-page application** →
   add the deployed URL with trailing slash as a redirect URI, e.g.
   `https://<user>.github.io/<repo>/`.

---

## Project layout

```
src/
  App.tsx                  app shell, step routing, MSAL wiring
  main.tsx                 bootstrap; runs MSAL.handleRedirectPromise
                           and applies theme before React mounts
  components/              presentational components
  lib/
    permissions.ts         PPPC permission catalog + TCC service names
    knownApps.ts           bundled designated code requirements
    plist.ts               minimal Info.plist parser
    files.ts               .zip / .plist upload handling
    mobileconfig.ts        XML generator (byte-equivalent to v2)
    profiles.ts            wraps generator with bundle/separate logic
    state.ts               app entry defaults + helpers
    types.ts               shared types
    auth/                  MSAL setup + useAuth hook + scopes
    graph.ts               thin Microsoft Graph fetch wrapper
    assignments.ts         Intune assignment config + body builder
    deploy.ts              create profile + assign + portal URL
    theme.ts               light/dark theme handling
legacy/                    original vanilla-JS v2 app (read-only reference)
scripts/
  verify-equivalence.mts   regression test against legacy generator
```

---

## Caveats

- Some macOS permissions can only allow **user-approved toggling** (Apple
  limitation — Screen Recording, Microphone, Camera).
- Generated profiles are **unsigned**. Intune doesn't require signing for
  custom configuration profiles.
- Intune portal's per-policy deep links sometimes don't render assignment
  filters on first load — refresh once and they appear. Not a tool bug.

---

## License

Provided as-is. Test in a pilot group before broad deployment.
