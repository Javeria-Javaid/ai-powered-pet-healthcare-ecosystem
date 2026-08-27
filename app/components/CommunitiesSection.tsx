'use client';

interface CommunitiesSectionProps {
  onOwnerClick: () => void;
  onVetClick: () => void;
  onClinicClick: () => void;
}

export default function CommunitiesSection({ onOwnerClick, onVetClick, onClinicClick }: CommunitiesSectionProps) {
  return (
    <section id="features" className="py-20 bg-zinc-50/50 border-t border-b border-zinc-150">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900">
            One Platform. <span className="text-blue-600">Three Connected Communities.</span>
          </h2>
          <p className="text-zinc-500 text-sm md:text-base">
            Bringing pet owners, veterinarians, and clinics together for better care and healthier pets.
          </p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card 1: For Pet Owners */}
          <div id="owners" className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-teal-550 flex items-center justify-center text-white text-lg font-bold">
                  👤
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">For Pet Owners</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Manage pet profiles, health records, appointments, and get AI-powered health advice.
              </p>

              <ul className="flex flex-col gap-2 mt-2 text-xs font-semibold text-zinc-700">
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span> Add & manage multiple pets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span> Track health history & vaccines
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span> Book appointments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span> AI health assistant 24/7
                </li>
              </ul>
            </div>
            
            <div>
              <div className="h-44 w-full overflow-hidden bg-teal-50">
                <img
                  src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400"
                  alt="Pet owner with cat"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
                <button
                  onClick={onOwnerClick}
                  className="rounded px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  Learn More <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: For Veterinarians */}
          <div id="vets" className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center text-white text-lg font-bold">
                  🩺
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">For Veterinarians</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Access patient history, manage appointments, and deliver better care with complete insights.
              </p>

              <ul className="flex flex-col gap-2 mt-2 text-xs font-semibold text-zinc-700">
                <li className="flex items-center gap-2">
                  <span className="text-violet-600">✓</span> View & manage appointments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-violet-600">✓</span> Access authorized records
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-violet-600">✓</span> Add medical records
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-violet-600">✓</span> Grow your practice
                </li>
              </ul>
            </div>
            
            <div>
              <div className="h-44 w-full overflow-hidden bg-violet-50">
                <img
                  src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=400"
                  alt="Veterinarian holding dog"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
                <button
                  onClick={onVetClick}
                  className="rounded px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  Learn More <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: For Clinics */}
          <div id="clinics" className="bg-white rounded-2xl border border-zinc-150 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  🏥
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900">For Clinics</h3>
                </div>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Streamline operations, collaborate with vets, and build stronger relationships with pet families.
              </p>

              <ul className="flex flex-col gap-2 mt-2 text-xs font-semibold text-zinc-700">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Clinic profile & management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Associate veterinarians
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Streamlined appointments
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✓</span> Trusted by pet owners
                </li>
              </ul>
            </div>
            
            <div>
              <div className="h-44 w-full overflow-hidden bg-blue-50">
                <img
                  src="https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400"
                  alt="Veterinary clinic building"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-between items-center">
                <button
                  onClick={onClinicClick}
                  className="rounded px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  Learn More <span>→</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
