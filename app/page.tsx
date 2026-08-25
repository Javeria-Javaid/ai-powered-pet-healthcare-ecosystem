'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PET_OWNER');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user.role === 'VETERINARIAN') {
            router.push('/vet/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (e) {
        // Not authenticated
      }
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering 
        ? { email, password, role, firstName, lastName, phone } 
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (data.user.role === 'VETERINARIAN') {
          router.push('/vet/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error.message || 'Authentication failed.');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection error occurred.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans px-4 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-blue-600">Pet Healthcare</h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            {isRegistering ? 'Create your ecosystem profile' : 'Sign in to access pet health portals'}
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
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">Password</label>
            <input 
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
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
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 block mb-1">Last Name</label>
                  <input 
                    type="text" required placeholder="Owner"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Phone Number</label>
                <input 
                  type="text" placeholder="+1555000000"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 block mb-1">Register As</label>
                <select 
                  value={role} onChange={e => setRole(e.target.value)}
                  className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
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

        <div className="text-center mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
