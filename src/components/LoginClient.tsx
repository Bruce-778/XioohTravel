"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";

type LoginLabels = {
  title: string;
  email: string;
  code: string;
  sendCode: string;
  verifyCode: string;
  sending: string;
  verifying: string;
  invalidEmail: string;
  invalidCode: string;
  back: string;
  emailHint: string;
  codeHint: string;
  networkError: string;
  failedToSend: string;
  testMode: string;
  testCode: string;
  testVisible: string;
  inboxHint: string;
  emailPlaceholder: string;
  codePlaceholder: string;
};

type LoginClientProps = {
  labels: LoginLabels;
};

export function LoginClient({ labels }: LoginClientProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function sendCode() {
    if (!email || !email.includes("@")) {
      setError(labels.invalidEmail);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || labels.failedToSend);
        return;
      }

      setStep("code");
      setCountdown(60);
      setDevCode(data._dev_code ?? "");
    } catch {
      setError(labels.networkError);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCodeSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await sendCode();
  }

  async function handleSendCodeClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    await sendCode();
  }

  async function handleVerifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code || code.length < 4) {
      setError(labels.invalidCode);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || labels.invalidCode);
        return;
      }

      window.location.href = "/";
    } catch {
      setError(labels.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{labels.title}</h1>
        <div className="mb-8 space-y-2 text-slate-500">
          <p>{step === "email" ? labels.emailHint : `${labels.codeHint} ${email}`}</p>
          {step === "code" ? <p className="text-sm">{labels.inboxHint}</p> : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {step === "email" ? (
          <form onSubmit={handleSendCodeSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{labels.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={labels.emailPlaceholder}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? labels.sending : labels.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{labels.code}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={labels.codePlaceholder}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
              {devCode ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="mb-1 font-bold">{labels.testMode}:</p>
                  <p>
                    {labels.testCode}: <span className="font-mono text-lg font-bold">{devCode}</span>
                  </p>
                  <p className="mt-1 text-xs opacity-70">{labels.testVisible}</p>
                </div>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 py-3 font-bold text-white shadow-lg shadow-brand-200 transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? labels.verifying : labels.verifyCode}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="text-slate-500 hover:text-brand-600"
              >
                {labels.back}
              </button>
              {countdown > 0 ? (
                <span className="text-slate-400">{countdown}s</span>
              ) : (
                <button type="button" onClick={handleSendCodeClick} className="font-medium text-brand-600">
                  {labels.sendCode}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
