import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { authApi, type AdminLoginChallenge, type ApiError } from '@/services/api';
import { cn } from '@/lib/utils';

/** The server prefixes this when the code step is over and the password is needed again. */
const RESTART = 'RESTART_LOGIN:';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Step 2: the emailed 8-digit code.
  const [challenge, setChallenge] = useState<AdminLoginChallenge | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const backToPassword = (message?: string) => {
    setChallenge(null);
    setCode('');
    setPassword('');
    if (message) toast.error(message);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.adminLogin(email, password);
      setChallenge(res);
      setCode('');
      setResendIn(res.resend_after);
      toast.success(`Verification code sent to ${res.email_hint}`);
    } catch (err) {
      toast.error((err as ApiError)?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || code.length !== 8) return;
    setLoading(true);
    try {
      const res = await authApi.verify2fa(challenge.challenge_token, code);
      login(res.access_token, res.user);
      toast.success('Admin access granted');
      navigate('/');
    } catch (err) {
      const detail = (err as ApiError)?.detail || 'Verification failed';
      if (detail.startsWith(RESTART)) backToPassword(detail.slice(RESTART.length).trim());
      else {
        setCode('');
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challenge || resendIn > 0) return;
    setLoading(true);
    try {
      const res = await authApi.resend2fa(challenge.challenge_token);
      setCode('');
      setResendIn(res.resend_after);
      toast.success(res.message);
    } catch (err) {
      const detail = (err as ApiError)?.detail || 'Could not resend the code';
      if (detail.startsWith(RESTART)) backToPassword(detail.slice(RESTART.length).trim());
      else toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient backdrop */}
      <div className="grid-pattern pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-blue-500/[0.05] blur-[140px]" />

      <div className="relative z-10 w-full max-w-[420px] animate-rise">
        <div className="panel p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Artha<span className="text-primary">X</span> Admin
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {challenge ? 'Step 2 of 2 — verify it’s you' : 'Super admin console — authorised access only'}
            </p>
          </div>

          {!challenge ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="field-label">Admin email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email" required autoComplete="username" placeholder="you@arthax.ai"
                    className="field pl-10" value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                    placeholder="••••••••" className="field px-10" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <SubmitButton loading={loading} label="Continue" busyLabel="Checking…" />
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <button
                type="button" onClick={() => backToPassword()}
                className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Use a different account
              </button>
              <p className="text-sm text-muted-foreground">
                We emailed an 8-digit code to <span className="font-semibold text-foreground">{challenge.email_hint}</span>.
                It expires in {Math.round(challenge.expires_in / 60)} minutes and works for this sign-in only.
              </p>
              <div>
                <label className="field-label">Verification code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={8}
                    placeholder="00000000" value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="field pl-10 text-center font-mono text-lg font-bold tracking-[0.4em]"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-300">
                Never share this code. If you didn’t just sign in, someone has your password — change it now.
              </div>
              <SubmitButton loading={loading} disabled={code.length !== 8} label="Verify & sign in" busyLabel="Verifying…" />
              <p className="text-center text-xs text-muted-foreground">
                Didn’t get it? Check spam, or{' '}
                <button
                  type="button" onClick={handleResend} disabled={loading || resendIn > 0}
                  className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendIn > 0 ? `resend in ${resendIn}s` : 'send a new code'}
                </button>
              </p>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
          Every sign-in needs your password and a code sent to your email. Every action is attributed and logged.
        </p>
      </div>
    </div>
  );
}

function SubmitButton({ loading, disabled, label, busyLabel }: {
  loading: boolean; disabled?: boolean; label: string; busyLabel: string;
}) {
  return (
    <button
      type="submit" disabled={loading || disabled}
      className={cn(
        'mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3',
        'text-sm font-bold text-primary-foreground transition-all',
        'hover:shadow-glow active:scale-[0.99] disabled:opacity-50',
      )}
    >
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {busyLabel}</> : label}
    </button>
  );
}
