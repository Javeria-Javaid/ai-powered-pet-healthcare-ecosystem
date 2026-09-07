'use client';
import { PawPrint } from 'lucide-react';


interface HeroProps {
  onRegisterClick: () => void;
}

export default function Hero({ onRegisterClick }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 to-white py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-12">
        {/* Left text column */}
        <div className="flex flex-col gap-5 sm:gap-6 text-center md:text-left items-center md:items-start">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 w-fit">
            <span><PawPrint className="inline w-4 h-4" /></span> AI Powered Pet Healthcare Ecosystem
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-tight text-zinc-900">
            Better Health.<br />
            <span className="text-blue-600">Happier Pets. <PawPrint className="inline w-6 h-6 sm:w-8 sm:h-8" /></span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-zinc-600 max-w-lg leading-relaxed">
            An AI-powered pet healthcare ecosystem for pet owners, veterinarians, and clinics to manage health, appointments, and care — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-2 w-full sm:w-auto">
            <button
              onClick={onRegisterClick}
              className="w-full sm:w-auto rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/30 transition flex items-center justify-center gap-2"
            >
              Get Started Free <span>→</span>
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto rounded-full border border-blue-600 px-6 py-3.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition text-center"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Right illustration column */}
        <div className="relative flex justify-center w-full mt-4 md:mt-0">
          <div className="relative w-full max-w-sm sm:max-w-md h-[280px] sm:h-[350px] md:h-[400px] rounded-3xl md:rounded-[2rem] overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800"
              alt="Woman hugging Golden Retriever dog"
              className="w-full h-full object-cover"
            />
            {/* Ambient soft background glow shapes */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
