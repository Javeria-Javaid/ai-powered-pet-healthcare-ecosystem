'use client';
import { PawPrint } from 'lucide-react';


interface NavbarProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

export default function Navbar({ onLoginClick, onRegisterClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-150 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="text-2xl"><PawPrint className="inline w-4 h-4" /></span>
          <span className="text-xl font-bold tracking-tight text-zinc-900">PETIVA</span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">Features</a>
          <a href="#owners" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Pet Owners</a>
          <a href="#vets" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Veterinarians</a>
          <a href="#clinics" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">For Clinics</a>
          <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">Pricing</a>
          <a href="#about" className="text-sm font-medium text-zinc-600 hover:text-blue-600 transition">About Us</a>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={onLoginClick}
            className="text-sm font-semibold text-zinc-700 hover:text-blue-600 transition"
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
      </div>
    </header>
  );
}
