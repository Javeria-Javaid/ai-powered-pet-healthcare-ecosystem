import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Working hours: 9 AM - 5 PM Asia/Karachi (fixed UTC+5) — the same rule the AI assistant's
// create_booking enforces and check_slots / the reschedule slots route assume.
const WORKING_START_HOUR = 9;
const WORKING_END_HOUR = 17;

// GET /api/vet/discovery — Veterinarian Discovery (blueprint Section 14).
// Browse/search vets by name, specialization, clinic, location (clinic address) and
// availability on a specific date. Supported query params:
//   ?name=            — matches vet first/last name (contains, case-insensitive)
//   ?specialization=  — matches specialization (contains, case-insensitive)
//   ?clinic=          — matches an associated clinic name (contains, case-insensitive)
//   ?location=        — matches an associated clinic address (contains, case-insensitive)
//   ?date=YYYY-MM-DD  — availability filter: each result gets availability.freeSlots for that
//                       date (same 9-17 Karachi grid and busy rules as check_slots); vets with
//                       no free slot that day are excluded from the results.
// The flat response shape (id, firstName, lastName, clinics[]) is preserved for the booking
// modal; meta carries the distinct specialization/clinic lists computed over ALL vets so the
// filter dropdowns stay stable regardless of the active search.

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const name = (searchParams.get('name') || '').trim();
    const specialization = (searchParams.get('specialization') || '').trim();
    const clinic = (searchParams.get('clinic') || '').trim();
    const location = (searchParams.get('location') || '').trim();
    const date = (searchParams.get('date') || '').trim();

    let availabilityDate: string | null = null;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Date must be in YYYY-MM-DD format.' } },
          { status: 400 }
        );
      }
      const endOfDay = new Date(`${date}T23:59:59.999+05:00`);
      if (endOfDay < new Date()) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'That date has already passed — please choose a future date.' } },
          { status: 400 }
        );
      }
      availabilityDate = date;
    }

    // Server-side filters that translate directly to Prisma conditions.
    const where: any = {};
    if (name || specialization) {
      where.AND = [];
      if (name) {
        where.AND.push({
          OR: [
            { user: { firstName: { contains: name, mode: 'insensitive' } } },
            { user: { lastName: { contains: name, mode: 'insensitive' } } },
          ],
        });
      }
      if (specialization) {
        where.AND.push({ specialization: { contains: specialization, mode: 'insensitive' } });
      }
    }
    if (clinic || location) {
      const clinicConditions: any = { clinics: { some: { status: 'ACTIVE', clinic: {} } } };
      if (clinic) {
        clinicConditions.clinics.some.clinic = {
          name: { contains: clinic, mode: 'insensitive' },
        };
      }
      if (location) {
        clinicConditions.clinics.some.clinic = {
          ...clinicConditions.clinics.some.clinic,
          address: { contains: location, mode: 'insensitive' },
        };
      }
      where.AND = where.AND || [];
      where.AND.push(clinicConditions);
    }

    const vets = await prisma.veterinarian.findMany({
      where,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        clinics: {
          where: { status: 'ACTIVE' },
          include: { clinic: true },
        },
      },
      orderBy: [{ isVerified: 'desc' }, { licenseNumber: 'asc' }],
    });

    // Availability: booked REQUESTED/CONFIRMED appointments for the matched vets on the
    // requested date, grouped per vet. Past hours of today are never free.
    const vetIds = vets.map((v) => v.id);
    let busyByVet = new Map<string, Set<number>>();
    if (availabilityDate && vetIds.length > 0) {
      const startOfDay = new Date(`${availabilityDate}T00:00:00+05:00`);
      const endOfDay = new Date(`${availabilityDate}T23:59:59.999+05:00`);
      const booked = await prisma.appointment.findMany({
        where: {
          vetId: { in: vetIds },
          dateTime: { gte: startOfDay, lte: endOfDay },
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
        select: { vetId: true, dateTime: true },
      });
      busyByVet = booked.reduce((map, a) => {
        if (!map.has(a.vetId)) map.set(a.vetId, new Set());
        map.get(a.vetId)!.add(a.dateTime.getTime());
        return map;
      }, new Map<string, Set<number>>());
    }

    const now = new Date();
    let formattedVets = vets.map((vet) => {
      const activeClinics = vet.clinics.map((a) => ({
        id: a.clinic.id,
        name: a.clinic.name,
        address: a.clinic.address,
      }));

      let availability: { date: string; freeSlots: { hour: number; label: string; iso: string }[] } | null = null;
      if (availabilityDate) {
        const busy = busyByVet.get(vet.id) || new Set<number>();
        const freeSlots = [];
        for (let hour = WORKING_START_HOUR; hour < WORKING_END_HOUR; hour++) {
          const iso = `${availabilityDate}T${String(hour).padStart(2, '0')}:00:00+05:00`;
          const slotDate = new Date(iso);
          if (slotDate > now && !busy.has(slotDate.getTime())) {
            freeSlots.push({
              hour,
              label: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: true }).format(slotDate),
              iso,
            });
          }
        }
        availability = { date: availabilityDate, freeSlots };
      }

      return {
        id: vet.id,
        specialization: vet.specialization,
        licenseNumber: vet.licenseNumber,
        isVerified: vet.isVerified,
        firstName: vet.user.firstName,
        lastName: vet.user.lastName,
        email: vet.user.email,
        phone: vet.user.phone,
        clinics: activeClinics,
        ...(availability ? { availability } : {}),
      };
    });

    // When the owner searches by availability, only vets with a free slot that day qualify.
    if (availabilityDate) {
      formattedVets = formattedVets.filter((v) => v.availability!.freeSlots.length > 0);
    }

    // Distinct specialization + clinic lists over ALL vets (stable filter dropdowns).
    const allVets = await prisma.veterinarian.findMany({
      include: {
        clinics: { where: { status: 'ACTIVE' }, include: { clinic: true } },
      },
    });
    const specializations = Array.from(
      new Set(allVets.map((v) => v.specialization).filter(Boolean))
    ).sort() as string[];
    const clinicMap = new Map<string, { id: string; name: string; address: string }>();
    allVets.forEach((v) =>
      v.clinics.forEach((a) => {
        if (!clinicMap.has(a.clinic.id)) {
          clinicMap.set(a.clinic.id, { id: a.clinic.id, name: a.clinic.name, address: a.clinic.address });
        }
      })
    );

    return NextResponse.json({
      success: true,
      veterinarians: formattedVets,
      meta: {
        specializations,
        clinics: Array.from(clinicMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHENTICATED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not logged in.' } },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An error occurred.' } },
      { status: 500 }
    );
  }
}
