'use client';
import { useState, useEffect } from 'react';
import { X, PawPrint, Rocket, CheckCircle, AlertCircle } from 'lucide-react';

// Auth modal views
type AuthView = 'login' | 'register' | 'forgot-password' | 'forgot-success' | 'reset-password' | 'reset-success';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  role: string;
  setRole: (val: string) => void;
  error: string;
  setError: (val: string) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleGoogleCallback: (response: any) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  isRegistering,
  setIsRegistering,
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  role,
  setRole,
  error,
  setError,
  loading,
  handleSubmit,
  handleGoogleCallback,
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(isRegistering ? 'register' : 'login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    setView(isRegistering ? 'register' : 'login');
  }, [isRegistering]);

  // Re-render Google sign-in button when modal opens
  useEffect(() => {
    if (isOpen && (view === 'login' || view === 'register') && (window as any).google) {
      const renderTimer = setTimeout(() => {
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          const btnWidth = Math.min(382, Math.max(250, (btnContainer.parentElement?.clientWidth || 320) - 10));
          (window as any).google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: btnWidth }
          );
        }
      }, 100);
      return () => clearTimeout(renderTimer);
    }
  }, [isOpen, view]);

  if (!isOpen) return null;

  const inputCls = 'w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600';
  const labelCls = 'text-xs font-semibold text-zinc-500 block mb-1';

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      setForgotLoading(false);
      if (res.status === 429) {
        setForgotError(data.error?.message || 'Too many requests. Please try again later.');
        return;
      }
      // Always show success (don't reveal account existence)
      setView('forgot-success');
    } catch {
      setForgotLoading(false);
      setForgotError('Connection error. Please try again.');
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();
      setResetLoading(false);
      if (!data.success) {
        setResetError(data.error?.message || 'Reset failed. The link may have expired.');
        return;
      }
      setView('reset-success');
    } catch {
      setResetLoading(false);
      setResetError('Connection error. Please try again.');
    }
  }

  function goToLogin() {
    setView('login');
    setIsRegistering(false);
    setError('');
    setForgotError('');
    setResetError('');
    setForgotEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md my-auto max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-600"><PawPrint className="inline w-6 h-6 mr-1" /> PETIVA</h1>
          <p className="text-sm text-zinc-500 mt-1.5 dark:text-zinc-400">
            {view === 'login' && 'Sign in to access portals'}
            {view === 'register' && 'Create your pet healthcare profile'}
            {view === 'forgot-password' && 'Reset your password'}
            {view === 'forgot-success' && 'Check your email'}
            {view === 'reset-password' && 'Set a new password'}
            {view === 'reset-success' && 'Password updated'}
          </p>
        </div>

        {/* ── LOGIN / REGISTER ── */}
        {(view === 'login' || view === 'register') && (
          <>
            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" required placeholder="owner@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Password</label>
                <input type="password" required placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className={inputCls} />
              </div>

              {view === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>First Name</label>
                      <input type="text" required placeholder="Jane"
                        value={firstName} onChange={e => setFirstName(e.target.value)}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Last Name</label>
                      <input type="text" required placeholder="Owner"
                        value={lastName} onChange={e => setLastName(e.target.value)}
                        className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Phone Number</label>
                    <input type="text" placeholder="+1555000000"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Register As</label>
                    <select value={role} onChange={e => setRole(e.target.value)}
                      className={inputCls}>
                      <option value="PET_OWNER">Pet Owner</option>
                      <option value="VETERINARIAN">Veterinarian</option>
                      <option value="CLINIC_ADMIN">Clinic Admin</option>
                    </select>
                  </div>
                </>
              )}

              <button type="submit" disabled={loading}
                className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 mt-2">
                {loading ? 'Processing...' : view === 'register' ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            {view === 'login' && (
              <div className="text-center mt-2">
                <button
                  onClick={() => { setView('forgot-password'); setError(''); }}
                  className="text-xs text-zinc-400 hover:text-blue-600 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <div className="my-4 flex items-center justify-between">
              <span className="w-1/5 border-b border-zinc-200 dark:border-zinc-800"></span>
              <span className="text-xs uppercase text-zinc-400">or</span>
              <span className="w-1/5 border-b border-zinc-200 dark:border-zinc-800"></span>
            </div>

            <div className="flex flex-col gap-2">
              <div id="google-signin-btn" className="flex justify-center w-full"></div>
              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={() => handleGoogleCallback({ credential: `mock_google_token_owner-google-${Date.now()}@example.com_Jane_Google` })}
                  className="w-full text-center rounded border border-zinc-300 py-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700"
                >
                  <Rocket className="inline w-4 h-4" /> Continue with Mock Google (Dev Only)
                </button>
              )}
            </div>

            <div className="text-center mt-6 pt-4 border-t border-zinc-150 dark:border-zinc-800">
              <button
                onClick={() => {
                  setIsRegistering(view === 'login');
                  setView(view === 'login' ? 'register' : 'login');
                  setError('');
                }}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {view === 'register' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {view === 'forgot-password' && (
          <>
            {forgotError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 shrink-0" /> {forgotError}
              </div>
            )}
            <p className="text-xs text-zinc-500 mb-4">
              Enter the email address associated with your account and we will send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" required placeholder="owner@example.com"
                  value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className={inputCls} />
              </div>
              <button type="submit" disabled={forgotLoading}
                className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {forgotLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>
            </form>
            <div className="text-center mt-4">
              <button onClick={goToLogin} className="text-xs text-zinc-400 hover:text-blue-600 hover:underline">
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT SUCCESS ── */}
        {view === 'forgot-success' && (
          <>
            <div className="flex flex-col items-center gap-3 mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-sm text-zinc-600 text-center dark:text-zinc-400">
                If an account exists for <strong>{forgotEmail}</strong>, reset instructions have been sent.
              </p>
            </div>
            <p className="text-xs text-zinc-500 text-center mb-4">
              Once you receive your reset token, enter it below to set a new password.
            </p>
            <button
              onClick={() => setView('reset-password')}
              className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Enter Reset Token
            </button>
            <div className="text-center mt-4">
              <button onClick={goToLogin} className="text-xs text-zinc-400 hover:text-blue-600 hover:underline">
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* ── RESET PASSWORD ── */}
        {view === 'reset-password' && (
          <>
            {resetError && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 shrink-0" /> {resetError}
              </div>
            )}
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Reset Token</label>
                <input type="text" required placeholder="Paste your reset token"
                  value={resetToken} onChange={e => setResetToken(e.target.value)}
                  className={inputCls} />
                <p className="text-xs text-zinc-400 mt-1">Check your email (or server logs in dev mode)</p>
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" required placeholder="Min 8 characters"
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className={inputCls} />
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input type="password" required placeholder="Repeat password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className={inputCls} />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <button type="submit" disabled={resetLoading}
                className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <div className="text-center mt-4">
              <button onClick={goToLogin} className="text-xs text-zinc-400 hover:text-blue-600 hover:underline">
                Back to Sign In
              </button>
            </div>
          </>
        )}

        {/* ── RESET SUCCESS ── */}
        {view === 'reset-success' && (
          <>
            <div className="flex flex-col items-center gap-3 mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="text-sm text-zinc-600 text-center dark:text-zinc-400">
                Your password has been reset successfully. All existing sessions have been invalidated.
              </p>
            </div>
            <button
              onClick={goToLogin}
              className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign In with New Password
            </button>
          </>
        )}
      </div>
    </div>
  );
}
