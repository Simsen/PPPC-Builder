# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A zero-build, fully client-side web app that generates macOS **PPPC** (`.mobileconfig`) configuration profiles for deployment via Microsoft Intune. Published at https://www.simsenblog.dk/pppc-builder/. No server, no backend, no data ever leaves the browser.

The project is three static files: `index.html`, `styles.css`, `app.js`. Only one external dependency (JSZip via CDN). There is no package manager, build step, bundler, lint config, or test suite.

## Running locally

Open `index.html` directly in a browser, or serve the directory:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

The inline plist parser in `index.html` exists specifically so `file://` URLs work without CORS issues — do not move it to an external script without preserving that behavior.

## Architecture

### Data flow
1. **App acquisition** — user either uploads a `.zip` of a `.app` bundle (JSZip extracts `Contents/Info.plist`), uploads `Info.plist` directly, or picks from the hardcoded `KNOWN_APPS` list in `app.js`. The plist is parsed by the inline parser in `index.html` (a minimal DOMParser-based implementation, not a full plist lib).
2. **State** — `selectedApps` array holds `{ id, app, permissions, expanded, isKnownApp }` entries. Each app independently tracks its enabled permissions, per-permission `Authorization` value (`Allow`/`AllowStandardUserToSetSystemService`/`Deny`), and a `codeRequirement` string.
3. **Code requirement resolution** — uploaded apps are matched against `KNOWN_APPS` by `CFBundleIdentifier`; if matched, the canonical `codeRequirement` (the designated requirement string used in PPPC's `CodeRequirement` field) is auto-filled. Otherwise the user enters it manually.
4. **Profile generation** — `generateMobileconfig()` produces a single `.mobileconfig` plist combining a top-level `PayloadContent` array with one `com.apple.TCC.configuration-profile-policy` payload per selected app, each containing a `Services` dict keyed by TCC service name (see `PPPC_PERMISSIONS[].tccService`).
5. **Output** — XML is rendered live in `#xml-output`, can be copied or downloaded as `.mobileconfig`.

### Key tables
- `PPPC_PERMISSIONS` (app.js:2) — the catalog of supported permissions. The `canForceAllow: false` ones (Screen Recording, Microphone, Camera) are Apple-imposed and can **only** use `AllowStandardUserToSetSystemService` — the UI must not offer `Allow` for these.
- `KNOWN_APPS` (app.js:86) — bundle ID → designated code requirement lookup. Add new apps here when expanding built-in support; the `codeRequirement` string must come from `codesign --display -r - /Applications/<App>.app` on a real signed copy.

### TCC service mapping
The TCC service names in `tccService` (e.g. `SystemPolicyAllFiles`, `ScreenCapture`, `BluetoothAlways`) are Apple's exact strings — they become dict keys in the generated profile and must match macOS expectations exactly. Don't rename them.

## Editing notes

- All three files use plain DOM manipulation — no framework. State changes go through `updateUI()` → `renderAppsList()` → `updatePreview()`.
- Generated XML must be a valid plist (`<!DOCTYPE plist PUBLIC ...>`); `escapeXml()` in app.js handles user-supplied strings.
- Generated profiles are intentionally **unsigned** — Intune accepts unsigned `.mobileconfig` uploads. Do not add signing logic without explicit request.
- The repo's `.git` history shows README-only commits recently — code changes should keep the single-file-per-concern structure.
