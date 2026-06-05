"use client";

import { Eye, EyeOff, LogIn, UserPlus, Wrench, Crown, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCaredeskSetupStatus, loginCaredesk, setupCaredeskOwner, validateCaredeskPassword } from "../../features/caredesk/api/caredesk-api";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";

type SetupStatus = "loading" | "ready" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus>("loading");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [showPassword, setShowPassword] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const { restoreDraft, clearDraft } = useDraftAutosave("login", { email, password, name, setupToken });

  useEffect(() => {
    const draft = restoreDraft();
    if (draft) {
      setEmail(draft.email || "");
      setPassword(draft.password || "");
      setName(draft.name || "");
      setSetupToken(draft.setupToken || "");
    }
  }, []);

  useEffect(() => {
    void getCaredeskSetupStatus()
      .then((result) => {
        setNeedsSetup(result.needsSetup);
        setStatus("ready");
        setError(undefined);
      })
      .catch((loadError: Error) => {
        setStatus("error");
        setError(loadError.message);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const passwordCheck = validateCaredeskPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    try {
      const user = needsSetup
        ? await setupCaredeskOwner({ setupToken, name, email, password })
        : await loginCaredesk({ email, password });
      clearDraft();
      router.push(user.role === "owner" ? "/dashboard" : "/scan");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    }
  }

  async function demoLogin(demoEmail: string, demoPassword: string) {
    setError(undefined);
    try {
      const user = await loginCaredesk({ email: demoEmail, password: demoPassword });
      clearDraft();
      router.push(user.role === "owner" ? "/dashboard" : "/scan");
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : "Demo login failed";
      if (msg.includes("401") || msg.toLowerCase().includes("invalid")) {
        setError("Demo user not available. Please set up CareDesk first.");
      } else {
        setError(msg);
      }
    }
  }

  return (
    <main className="login-screen">
      <Card className="login-panel w-full max-w-[420px]">
        <CardHeader className="pb-2">
          <div className="brand mb-4">
            <div className="brand-mark">FC</div>
            <div>
              <div>Fadhil CareDesk</div>
              <div className="job-meta">Repair Operations</div>
            </div>
          </div>
          <CardTitle className="text-2xl">{needsSetup ? "First Owner Setup" : demoMode ? "Choose Demo Account" : "Sign In"}</CardTitle>
          <CardDescription>
            {needsSetup
              ? "Create the first Owner/Fadhil account using the setup token."
              : demoMode
                ? "Use role-specific workspaces for intake, diagnosis, and owner review."
                : "Use your CareDesk email and password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" ? <p className="notice">Checking setup status...</p> : null}
          {status === "error" ? <p className="notice recovery-notice">{error}</p> : null}

          {status === "ready" ? (
            <>
              {!needsSetup && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <button
                    type="button"
                    className={"text-sm px-3 py-1 rounded-full border transition " + (!demoMode ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border")}
                    onClick={() => { setDemoMode(false); setError(undefined); }}
                  >
                    Real Login
                  </button>
                  <button
                    type="button"
                    className={"text-sm px-3 py-1 rounded-full border transition " + (demoMode ? "bg-primary text-white border-primary" : "bg-transparent text-muted-foreground border-border")}
                    onClick={() => { setDemoMode(true); setError(undefined); }}
                  >
                    Demo Access
                  </button>
                </div>
              )}

              {demoMode && !needsSetup ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition text-left"
                    onClick={() => demoLogin("hafiz@example.com", "TechPass123!")}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                      <Wrench size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Technician</div>
                      <div className="text-xs text-muted-foreground">Technician workspace (scan, my jobs, pickup)</div>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition text-left"
                    onClick={() => demoLogin("fadhil@example.com", "OwnerPass123!")}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600">
                      <Crown size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Fadhil</div>
                      <div className="text-xs text-muted-foreground">Owner/Manager workspace (dashboard, reports, settings)</div>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </button>
                  {error ? <p className="notice recovery-notice" aria-live="polite">{error}</p> : null}
                </div>
              ) : (
                <form className="login-options space-y-4" onSubmit={submit}>
                  {needsSetup ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="setup-token">Setup token</Label>
                        <Input
                          id="setup-token"
                          value={setupToken}
                          onChange={(event) => setSetupToken(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="owner-name">Owner name</Label>
                        <Input
                          id="owner-name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-1">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={needsSetup ? "new-password" : "current-password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        minLength={8}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                      </Button>
                    </div>
                  </div>
                  {error && status === "ready" ? (
                    <p className="notice recovery-notice" aria-live="polite">{error}</p>
                  ) : null}
                  <Button className="w-full" type="submit">
                    {needsSetup ? <UserPlus size={17} aria-hidden /> : <LogIn size={17} aria-hidden />}
                    {needsSetup ? "Create Owner Account" : "Login"}
                  </Button>
                </form>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
