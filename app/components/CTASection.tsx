'use client';
import { PawPrint } from 'lucide-react';


interface CTASectionProps {
  onRegisterClick: () => void;
}

export default function CTASection({ onRegisterClick }: CTASectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-[2rem] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left image column */}
          <div className="md:col-span-4 relative flex justify-center">
            <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
              <img
                src="https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=400"
                alt="Dog and Cat sitting side-by-side"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Soft decorative badge background decoration paw */}
            <div className="absolute -bottom-2 -right-2 text-3xl"><PawPrint className="inline w-4 h-4" /></div>
          </div>

          {/* Middle text column */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <h3 className="text-2xl font-black text-zinc-900">Because Every Pet Deserves the Best Care.</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Join thousands of pet parents and professionals who trust PETIVA for smarter, safer, and better pet care.
            </p>
          </div>

          {/* Right action column */}
          <div className="md:col-span-3 flex flex-col gap-2 items-center md:items-end">
            <button
              onClick={onRegisterClick}
              className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition flex items-center justify-center gap-2"
            >
              Get Started Free <span>→</span>
            </button>
            <span className="text-[10px] text-zinc-400">No credit card required.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
