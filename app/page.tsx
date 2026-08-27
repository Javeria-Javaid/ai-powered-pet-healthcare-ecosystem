'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AboutSection from './components/AboutSection';
import CommunitiesSection from './components/CommunitiesSection';
import HowItWorks from './components/HowItWorks';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

export default function Home() {
  const router = useRouter();

  // Auth form states
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PET_OWNER');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal open/close state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load Google SDK & check current session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user.role === 'VETERINARIAN') {
            router.push('/vet/dashboard');
          } else if (data.user.role === 'CLINIC_ADMIN') {
            router.push('/clinic/dashboard');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (e) {
        // Not authenticated
      }
    }
    checkAuth();

    // Dynamically load Google Identity Services SDK script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = async () => {
      if ((window as any).google) {
        try {
          const configRes = await fetch('/api/auth/google/config');
          const configData = await configRes.json();
          const clientId = configData.clientId;

          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCallback,
          });
        } catch (e) {
          console.error('Failed to load Google OAuth config:', e);
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  async function handleGoogleCallback(response: any) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success) {
        setShowAuthModal(false);
        if (data.user.role === 'VETERINARIAN') {
          router.push('/vet/dashboard');
        } else if (data.user.role === 'CLINIC_ADMIN') {
          router.push('/clinic/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.error.message || 'Google authentication failed.');
      }
    } catch (err) {
      setLoading(false);
      setError('Connection error occurred.');
    }
  }

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
        setShowAuthModal(false);
        if (data.user.role === 'VETERINARIAN') {
          router.push('/vet/dashboard');
        } else if (data.user.role === 'CLINIC_ADMIN') {
          router.push('/clinic/dashboard');
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

  function openLogin() {
    setIsRegistering(false);
    setError('');
    setShowAuthModal(true);
  }

  function openRegister() {
    setIsRegistering(true);
    setError('');
    setShowAuthModal(true);
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar Header */}
      <Navbar onLoginClick={openLogin} onRegisterClick={openRegister} />

      {/* Main content body */}
      <main className="flex-grow">
        {/* Hero Banner */}
        <Hero onRegisterClick={openRegister} />

        {/* Connected Care Description */}
        <AboutSection />

        {/* Platforms and Features */}
        <CommunitiesSection
          onOwnerClick={openRegister}
          onVetClick={openRegister}
          onClinicClick={openRegister}
        />

        {/* How It Works Guide */}
        <HowItWorks />

        {/* CTA Before Footer */}
        <CTASection onRegisterClick={openRegister} />
      </main>

      {/* Footer Navigation */}
      <Footer />

      {/* Single Unified Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        phone={phone}
        setPhone={setPhone}
        role={role}
        setRole={setRole}
        error={error}
        setError={setError}
        loading={loading}
        handleSubmit={handleSubmit}
        handleGoogleCallback={handleGoogleCallback}
      />
    </div>
  );
}
