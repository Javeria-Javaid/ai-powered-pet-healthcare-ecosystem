'use client';

import { useEffect } from 'react';

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
  
  // Re-render Google sign-in button when modal opens
  useEffect(() => {
    if (isOpen && (window as any).google) {
      const renderTimer = setTimeout(() => {
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', width: 382 }
          );
        }
      }, 100);
      return () => clearTimeout(renderTimer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-600">🐾 PETIVA</h1>
          <p className="text-sm text-zinc-500 mt-1.5 dark:text-zinc-400">
            {isRegistering ? 'Create your pet healthcare profile' : 'Sign in to access portals'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Email Address</label>
            <input 
              type="email" required placeholder="owner@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Password</label>
            <input 
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
            />
          </div>

          {isRegistering && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">First Name</label>
                  <input 
                    type="text" required placeholder="Jane"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Last Name</label>
                  <input 
                    type="text" required placeholder="Owner"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Phone Number</label>
                <input 
                  type="text" placeholder="+1555000000"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Register As</label>
                <select 
                  value={role} onChange={e => setRole(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="PET_OWNER">Pet Owner</option>
                  <option value="VETERINARIAN">Veterinarian</option>
                </select>
              </div>
            </>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {loading ? 'Processing...' : isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="my-4 flex items-center justify-between">
          <span className="w-1/5 border-b border-zinc-200 dark:border-zinc-800"></span>
          <span className="text-xs uppercase text-zinc-400">or</span>
          <span className="w-1/5 border-b border-zinc-200 dark:border-zinc-800"></span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Real Google button */}
          <div id="google-signin-btn" className="flex justify-center w-full"></div>
          {/* Developer Mock Google sign-in button */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              type="button"
              onClick={() => handleGoogleCallback({ credential: `mock_google_token_owner-google-${Date.now()}@example.com_Jane_Google` })}
              className="w-full text-center rounded border border-zinc-300 py-2 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700"
            >
              🚀 Continue with Mock Google (Dev Only)
            </button>
          )}
        </div>

        <div className="text-center mt-6 pt-4 border-t border-zinc-150 dark:border-zinc-800">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}
