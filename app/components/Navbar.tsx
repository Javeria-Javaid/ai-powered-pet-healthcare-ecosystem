'use client';
import { PawPrint, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-150 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="text-2xl"><PawPrint className="inline w-5 h-5 text-blue-600" /></span>
          <span className="text-xl font-serif font-bold tracking-tight text-zinc-900">PETIVA</span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">Features</a>
          <a href="#owners" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Pet Owners</a>
          <a href="#vets" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Veterinarians</a>
          <a href="#clinics" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Clinics</a>
          <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">Pricing</a>
          <a href="#about" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">About Us</a>
        </nav>

        {/* Auth Buttons - Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="text-sm font-semibold text-zinc-700 hover:text-blue-600 px-3 py-2 transition"
          >
            Log In
          </button>
          <button
            onClick={onRegisterClick}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            Get Started
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={onLoginClick}
            className="text-xs font-semibold text-zinc-700 hover:text-blue-600 px-2 py-1.5"
          >
            Log In
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-600 hover:text-zinc-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-6 py-4 flex flex-col gap-3 shadow-lg animate-in slide-in-from-top-2">
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            Features
          </a>
          <a 
            href="#owners" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            For Pet Owners
          </a>
          <a 
            href="#vets" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            For Veterinarians
          </a>
          <a 
            href="#clinics" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            For Clinics
          </a>
          <a 
            href="#pricing" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            Pricing
          </a>
          <a 
            href="#about" 
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 hover:text-blue-600 py-1.5 transition"
          >
            About Us
          </a>
          <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onRegisterClick(); }}
              className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
