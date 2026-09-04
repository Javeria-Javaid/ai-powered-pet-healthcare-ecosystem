'use client';
import { User, PawPrint, Calendar, TrendingUp } from 'lucide-react';


export default function HowItWorks() {
  return (
    <section className="py-20 bg-white border-b border-zinc-100">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            How PETIVA Works
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connecting line (for desktop only) */}
          <div className="hidden md:block absolute top-12 left-16 right-16 h-0.5 border-t-2 border-dashed border-blue-200 z-0"></div>

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-md">
              <User className="inline w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900">1. Create Account</h4>
              <p className="text-xs text-zinc-500 mt-2 max-w-[200px] leading-relaxed mx-auto">
                Sign up as a pet owner, veterinarian, or clinic.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-md">
              <PawPrint className="inline w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900">2. Add & Connect</h4>
              <p className="text-xs text-zinc-500 mt-2 max-w-[200px] leading-relaxed mx-auto">
                Add your pets or connect with your clinic and veterinarian.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-md">
              <Calendar className="inline w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900">3. Manage Care</h4>
              <p className="text-xs text-zinc-500 mt-2 max-w-[200px] leading-relaxed mx-auto">
                Track health, book appointments, and store medical records.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center gap-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 text-2xl shadow-md">
              <TrendingUp className="inline w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900">4. Better Health</h4>
              <p className="text-xs text-zinc-500 mt-2 max-w-[200px] leading-relaxed mx-auto">
                Get insights, follow treatment plans, and ensure happier lives.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
