'use client';

import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubsubscribed] = useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      setSubsubscribed(true);
      setEmail('');
    }
  }

  return (
    <footer className="bg-zinc-950 text-zinc-400 py-16 border-t border-zinc-900 font-sans">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        {/* Brand column */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-2xl">🐾</span>
            <span className="text-xl font-bold tracking-tight">PETIVA</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
            An AI-powered pet healthcare ecosystem connecting pet owners, veterinarians, and clinics for better care and healthier pets.
          </p>
          {/* Social Icons */}
          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition">📘</a>
            <a href="#" className="hover:text-white transition">📸</a>
            <a href="#" className="hover:text-white transition">🐦</a>
            <a href="#" className="hover:text-white transition">💼</a>
            <a href="#" className="hover:text-white transition">📺</a>
          </div>
        </div>

        {/* Platform links */}
        <div className="md:col-span-2 flex flex-col gap-3 text-xs">
          <h5 className="font-bold text-white uppercase tracking-wider">Platform</h5>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#" className="hover:text-white transition">How It Works</a>
          <a href="#" className="hover:text-white transition">Pricing</a>
          <a href="#" className="hover:text-white transition">AI Assistant</a>
          <a href="#" className="hover:text-white transition">Security</a>
        </div>

        {/* Users links */}
        <div className="md:col-span-2 flex flex-col gap-3 text-xs">
          <h5 className="font-bold text-white uppercase tracking-wider">For Users</h5>
          <a href="#owners" className="hover:text-white transition">Pet Owners</a>
          <a href="#vets" className="hover:text-white transition">Veterinarians</a>
          <a href="#clinics" className="hover:text-white transition">Veterinary Clinics</a>
          <a href="#" className="hover:text-white transition">Help Center</a>
          <a href="#" className="hover:text-white transition">FAQs</a>
        </div>

        {/* Company links */}
        <div className="md:col-span-2 flex flex-col gap-3 text-xs">
          <h5 className="font-bold text-white uppercase tracking-wider">Company</h5>
          <a href="#about" className="hover:text-white transition">About Us</a>
          <a href="#" className="hover:text-white transition">Blog</a>
          <a href="#" className="hover:text-white transition">Careers</a>
          <a href="#" className="hover:text-white transition">Contact Us</a>
          <a href="#" className="hover:text-white transition">Press Kit</a>
        </div>

        {/* Subscribe newsletter column */}
        <div className="md:col-span-2 flex flex-col gap-3 text-xs">
          <h5 className="font-bold text-white uppercase tracking-wider">Stay Updated</h5>
          <p className="text-zinc-500 leading-relaxed">
            Subscribe to our newsletter for pet health tips and platform updates.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2 mt-1">
            <input
              type="email" required placeholder="Enter your email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="rounded bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              className="rounded bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 text-xs transition"
            >
              {subscribed ? 'Subscribed! ✓' : 'Subscribe'}
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Copyright bar */}
      <div className="mx-auto max-w-7xl px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-zinc-600">
        <div className="flex flex-wrap gap-4">
          <span>© {new Date().getFullYear()} PETIVA. All rights reserved.</span>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
        </div>
        <div>
          <span>Made with ❤️ for pets and their people.</span>
        </div>
      </div>
    </footer>
  );
}
