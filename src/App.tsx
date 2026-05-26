import { useEffect, useMemo, useRef, useState } from 'react';
import { Apple, ArrowLeft } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { AppInput } from './components/AppInput';
import { AppCard } from './components/AppCard';
import { Card, CardHeader, CardBody } from './components/Card';
import { ProfileSettings } from './components/ProfileSettings';
import { OutputModeToggle } from './components/OutputModeToggle';
import { Preview } from './components/Preview';
import { DeploymentPanel } from './components/DeploymentPanel';
import { PolicyList } from './components/PolicyList';
import { Stepper, type Step } from './components/Stepper';
import { Toast } from './components/Toast';
import { generateProfiles } from './lib/profiles';
import { generateRandomUUID } from './lib/uuid';
import { useAuth } from './lib/auth/useAuth';
import { loadKnownApps } from './lib/knownApps';
import { makeAppEntry, totalEnabledPermissions } from './lib/state';
import type {
  AppInfo,
  KnownApp,
  OutputMode,
  PermissionState,
  ProfileSettings as ProfileSettingsType,
  SelectedApp,
} from './lib/types';

export default function App() {
  const [step, setStep] = useState<Step>('build');
  const [selectedApps, setSelectedApps] = useState<SelectedApp[]>([]);
  const [nextId, setNextId] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>('bundle');
  const [knownApps, setKnownApps] = useState<KnownApp[]>([]);
  const { state: auth, signIn, signOut } = useAuth();

  // Load the runtime-editable known apps list from /library/known-apps.json,
  // sorted alphabetically by displayName.
  useEffect(() => {
    void loadKnownApps().then((list) =>
      setKnownApps(
        [...list].sort((a, b) =>
          a.displayName.localeCompare(b.displayName, undefined, {
            sensitivity: 'base',
          }),
        ),
      ),
    );
  }, []);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const previousAccount = useRef(auth.account);

  // Surface sign-in transitions as toasts so the user can't miss them
  useEffect(() => {
    if (!previousAccount.current && auth.account) {
      setToast({
        kind: 'ok',
        message: `Signed in to Intune as ${auth.account.name ?? auth.account.username}`,
      });
    }
    if (previousAccount.current && !auth.account) {
      setToast({ kind: 'ok', message: 'Signed out of Intune' });
    }
    previousAccount.current = auth.account;
  }, [auth.account]);

  useEffect(() => {
    if (auth.error) {
      setToast({ kind: 'err', message: `Sign-in failed: ${auth.error}` });
    }
  }, [auth.error]);

  const [settings, setSettings] = useState<ProfileSettingsType>(() => ({
    organization: '',
    payloadName: '',
    payloadIdentifier: generateRandomUUID(),
    payloadDescription: '',
    scopeTagIds: ['0'],
    deploymentChannel: 'deviceChannel',
  }));

  const innerUUID = useMemo(() => generateRandomUUID(), []);

  function handleAppDetected(info: AppInfo, fromKnownList: boolean) {
    if (selectedApps.some((i) => i.app.bundleId === info.bundleId)) {
      setError(`${info.displayName} is already added`);
      return;
    }
    const isKnown =
      fromKnownList || knownApps.some((a) => a.bundleId === info.bundleId);
    setSelectedApps((prev) => [
      ...prev,
      makeAppEntry(info, nextId, prev.length === 0, isKnown),
    ]);
    setNextId((id) => id + 1);
    setError(null);
  }

  function updateApp(id: number, mutate: (a: SelectedApp) => SelectedApp) {
    setSelectedApps((prev) => prev.map((a) => (a.id === id ? mutate(a) : a)));
  }

  const profiles = useMemo(
    () => generateProfiles(selectedApps, settings, outputMode, innerUUID),
    [selectedApps, settings, outputMode, innerUUID],
  );

  const enabledCount = totalEnabledPermissions(selectedApps);
  const alreadySelectedBundleIds = selectedApps.map((i) => i.app.bundleId);
  const canDeploy = profiles.length > 0;

  function goToDeploy() {
    if (!canDeploy) return;
    setStep('deploy');
    // Scroll to top so user sees the new step from the start
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goToBuild() {
    setStep('build');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <TopBar
        clientIdConfigured={auth.clientIdConfigured}
        account={auth.account}
        busy={auth.busy}
        error={auth.error}
        onSignIn={signIn}
        onSignOut={signOut}
      />

      <main className="flex-1">
        <div className="max-w-[1760px] mx-auto px-6 py-6">
          <Stepper
            current={step}
            onChange={(s) => (s === 'deploy' ? goToDeploy() : goToBuild())}
            canDeploy={canDeploy}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_560px] gap-6">
            {/* LEFT: workspace — content swaps per step */}
            <div className="min-w-0">
              {step === 'build' ? (
                <>
                  <AppInput
                    knownApps={knownApps}
                    onAppDetected={handleAppDetected}
                    onError={setError}
                    error={error}
                    onClearError={() => setError(null)}
                    alreadySelectedBundleIds={alreadySelectedBundleIds}
                  />

                  {selectedApps.length > 0 && (
                    <Card>
                      <CardHeader
                        icon={<Apple className="w-4 h-4" />}
                        title="Selected applications"
                        subtitle={`${selectedApps.length} app${selectedApps.length === 1 ? '' : 's'} · ${enabledCount} permission${enabledCount === 1 ? '' : 's'} enabled`}
                      />
                      <OutputModeToggle
                        value={outputMode}
                        onChange={setOutputMode}
                        appCount={selectedApps.length}
                      />
                      <CardBody className="space-y-3">
                        {selectedApps.map((item) => (
                          <AppCard
                            key={item.id}
                            item={item}
                            mode={outputMode}
                            onToggleExpanded={() =>
                              updateApp(item.id, (a) => ({
                                ...a,
                                expanded: !a.expanded,
                              }))
                            }
                            onRemove={() =>
                              setSelectedApps((prev) =>
                                prev.filter((a) => a.id !== item.id),
                              )
                            }
                            onChangePermission={(permId, next: PermissionState) =>
                              updateApp(item.id, (a) => ({
                                ...a,
                                permissions: { ...a.permissions, [permId]: next },
                              }))
                            }
                            onChangeCodeRequirement={(next) =>
                              updateApp(item.id, (a) => ({
                                ...a,
                                app: { ...a.app, codeRequirement: next || null },
                              }))
                            }
                            onChangeProfile={(next) =>
                              updateApp(item.id, (a) => ({ ...a, profile: next }))
                            }
                          />
                        ))}
                      </CardBody>
                    </Card>
                  )}

                </>
              ) : (
                <>
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={goToBuild}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Build
                    </button>
                  </div>

                  <PolicyList
                    mode={outputMode}
                    apps={selectedApps}
                    shared={settings}
                    signedIn={!!auth.account}
                    onChangeApp={(id, partial) =>
                      updateApp(id, (a) => ({ ...a, ...partial }))
                    }
                    onChangeShared={setSettings}
                  />

                  <DeploymentPanel
                    profiles={profiles}
                    signedIn={!!auth.account}
                    tenantHint={auth.account?.username ?? null}
                    canSignIn={auth.clientIdConfigured}
                    onOpenSignIn={signIn}
                  />
                </>
              )}

              <footer className="text-center text-xs text-muted-foreground py-8 mt-2">
                <p>
                  This tool processes all data locally in your browser. No
                  information is sent to any server.
                </p>
                <p className="mt-1">
                  Generated profiles are <strong>unsigned</strong> and ready
                  for import into Microsoft Intune.
                </p>
              </footer>
            </div>

            {/* RIGHT: Profile metadata + sticky output rail */}
            <aside className="xl:sticky xl:top-[4.5rem] xl:self-start space-y-5">
              {step === 'build' &&
                selectedApps.length > 0 &&
                outputMode === 'bundle' && (
                  <ProfileSettings value={settings} onChange={setSettings} />
                )}
              <Preview
                profiles={profiles}
                selectedApps={selectedApps}
                mode={outputMode}
                deployEnabled={canDeploy && step === 'build'}
                onDeploy={goToDeploy}
              />
            </aside>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background/60">
        <div className="max-w-[1760px] mx-auto px-6 py-5 text-center text-xs text-muted-foreground">
          MacPPPC is owned and maintained by{' '}
          <a
            href="https://linktr.ee/royklo"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 hover:text-primary transition-colors"
          >
            Roy Klooster
          </a>{' '}
          and{' '}
          <a
            href="https://www.linkedin.com/in/simoneriksendk/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground/80 hover:text-primary transition-colors"
          >
            Simon Hartmann Eriksen
          </a>
          .
        </div>
      </footer>
    </div>
  );
}
