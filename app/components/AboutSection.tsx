'use client';

export default function AboutSection() {
  return (
    <section id="#about" className="py-20 bg-white border-t border-zinc-100">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-16">
        {/* Left image column */}
        <div className="relative">
          <div className="rounded-[2rem] overflow-hidden shadow-xl aspect-4/3 max-w-lg mx-auto">
            <img
              src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800"
              alt="Woman playing with dog and cat"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right text column */}
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">About PETIVA</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 leading-tight">
            Care Connected. Life Enriched.
          </h2>
          <p className="text-zinc-600 text-sm md:text-base leading-relaxed mt-2">
            PETIVA is an all-in-one pet healthcare ecosystem that brings pet owners, veterinarians, and clinics together on one smart platform. From health records and appointments to real-time insights, we make every part of your pet's care journey seamless and stress-free.
          </p>
          <div className="mt-4">
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Learn More <span>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
