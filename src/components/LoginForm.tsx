"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { completeOnboarding, requestCode, verifyCode } from "@/lib/auth/actions";

type Step = "phone" | "code" | "name";

/**
 * Phone + one-time-code sign in. No passwords. In the demo the code isn't texted
 * — the dev phone provider returns it (`surfacedCode`), so we skip the typing
 * entirely: one click runs the real requestCode → verifyCode round-trip and you
 * land on /home. This keeps the OTP path genuinely exercised (great for CI) while
 * losing the friction. A future real SMS provider returns no surfacedCode, so we
 * fall back to the manual "type the 6-digit code" step. New numbers still get an
 * onboarding name step; known ones go straight to /home.
 */
export function LoginForm({ cta = "Sign in" }: { cta?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  // Route after a successful verifyCode: known users → /home, new ones → name step.
  const afterVerify = (res: { onboardingComplete?: boolean }) => {
    if (res.onboardingComplete) router.push("/home");
    else setStep("name");
  };

  // Request a code, then either auto-verify (one click) or drop to the code step
  // so the user can type it. `manual` forces the latter even when the dev provider
  // surfaces the code — preserving the traditional "enter the OTP" flow.
  const requestAndGo = (manual: boolean) => {
    setError(undefined);
    start(async () => {
      const res = await requestCode(phone);
      if (!res.ok) return setError(res.error);
      const verifiedPhone = res.phone ?? phone;
      setPhone(verifiedPhone);
      setDevCode(res.surfacedCode);
      // Demo/dev provider surfaces the code → verify it now so one click signs in.
      // A real SMS provider returns no code → fall back to the manual code step.
      if (!manual && res.surfacedCode) {
        const verify = await verifyCode(verifiedPhone, res.surfacedCode);
        if (verify.ok) return afterVerify(verify);
        setError(verify.error);
      }
      setStep("code");
    });
  };

  const onPhone = (e: React.FormEvent) => {
    e.preventDefault();
    requestAndGo(false);
  };

  const onCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = await verifyCode(phone, code);
      if (!res.ok) return setError(res.error);
      afterVerify(res);
    });
  };

  const onName = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = await completeOnboarding(name);
      if (!res.ok) return setError(res.error);
      router.push("/home");
    });
  };

  const inputCls =
    "h-11 w-full rounded-lg border border-hairline bg-parchment px-3.5 text-[15px] text-ink placeholder:text-ink-soft/50 focus:border-sepia focus:outline-none focus:ring-2 focus:ring-sepia/20";
  const btnCls =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sepia px-7 text-[15px] font-medium text-cream transition-colors hover:bg-walnut disabled:opacity-70";

  return (
    <div className="flex flex-col gap-4">
      {step === "phone" && (
        <form onSubmit={onPhone} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Phone number</span>
            <input
              type="tel"
              name="phone"
              data-testid="login-phone"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0001"
              className={inputCls}
            />
          </label>
          <button type="submit" disabled={pending} data-testid="login-submit" className={btnCls}>
            {pending ? "Signing in…" : cta}
          </button>
          <button
            type="button"
            disabled={pending}
            data-testid="login-manual"
            onClick={() => requestAndGo(true)}
            className="text-sm text-ink-soft underline decoration-hairline underline-offset-4 hover:text-sepia disabled:opacity-70"
          >
            Enter the code manually
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onCode} className="flex flex-col gap-3">
          {devCode && (
            <p data-testid="login-demo-code" className="rounded-lg bg-brass/10 px-3.5 py-2.5 text-sm text-ink ring-1 ring-brass/30">
              Demo: your code is{" "}
              <span data-testid="login-demo-code-value" className="font-semibold tracking-wider">{devCode}</span>{" "}
              (normally texted to {phone}).
            </p>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Enter the 6-digit code</span>
            <input
              inputMode="numeric"
              data-testid="login-code"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              className={`${inputCls} tracking-[0.3em]`}
            />
          </label>
          <button type="submit" disabled={pending} data-testid="login-verify" className={btnCls}>
            {pending ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setCode(""); setError(undefined); }}
            className="text-sm text-ink-soft underline decoration-hairline underline-offset-4 hover:text-sepia"
          >
            Use a different number
          </button>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={onName} className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">Welcome! What should the family call you?</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Your name</span>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Margaret Whitfield"
              className={inputCls}
            />
          </label>
          <button type="submit" disabled={pending} className={btnCls}>
            {pending ? "Setting up…" : "Enter the chest"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
