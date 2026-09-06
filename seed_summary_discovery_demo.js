// Demo data for AI Health Summary (Section 19) and Veterinarian Discovery (Section 14).
// Idempotent: safe to re-run.
//  - Enriches Milo with a richer history: 2 consultations, an active condition, an allergy,
//    and two weight metrics so the health summary has real data to interpret.
//  - Adds four specialized veterinarians across both clinics so discovery has results
//    to filter by name / specialization / clinic / location.
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString && connectionString.startsWith('prisma+postgres://')) {
  const urlObj = new URL(connectionString);
  const apiKey = urlObj.searchParams.get('api_key');
  if (apiKey) {
    try {
      const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
      const params = JSON.parse(decoded);
      if (params.databaseUrl) connectionString = params.databaseUrl;
    } catch (e) {
      console.error('Failed to decode prisma+postgres API key:', e.message);
    }
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CLINIC_A = 'clinic-a-uuid-placeholder';
const CLINIC_B = 'clinic-b-uuid-placeholder';

async function main() {
  const ownerUser = await prisma.user.findUnique({ where: { email: 'owner@example.com' } });
  if (!ownerUser) throw new Error('owner@example.com not found — run prisma/seed.js first');

  const milo = await prisma.pet.findFirst({
    where: { name: 'Milo', ownerId: ownerUser.id },
  });
  if (!milo) throw new Error('Pet Milo not found — run prisma/seed.js first');

  // ---- 1. Enrich Milo's history for the AI Health Summary ----
  console.log('Seeding Milo health history...');

  const mr1 = await prisma.medicalRecord.upsert({
    where: { id: 'milo-med-record-gi-placeholder' },
    update: {},
    create: {
      id: 'milo-med-record-gi-placeholder',
      petId: milo.id,
      createdAt: new Date('2026-06-12T10:00:00.000Z'),
    },
  });
  await prisma.medicalRecordVersion.upsert({
    where: { id: 'milo-med-record-gi-ver-1' },
    update: {},
    create: {
      id: 'milo-med-record-gi-ver-1',
      recordId: mr1.id,
      editorId: ownerUser.id,
      symptoms: 'Vomiting twice, mild diarrhea, reduced appetite for one day.',
      diagnosis: 'Acute gastroenteritis (resolved).',
      treatmentPlan: 'Bland diet for 3 days, plenty of water, gradual food reintroduction.',
      notes: 'Owner reported scavenging trash two days earlier. Symptoms resolved within 48 hours.',
      isCurrent: true,
      createdAt: new Date('2026-06-13T09:00:00.000Z'),
    },
  });

  const mr2 = await prisma.medicalRecord.upsert({
    where: { id: 'milo-med-record-skin-placeholder' },
    update: {},
    create: {
      id: 'milo-med-record-skin-placeholder',
      petId: milo.id,
      createdAt: new Date('2026-08-28T14:00:00.000Z'),
    },
  });
  await prisma.medicalRecordVersion.upsert({
    where: { id: 'milo-med-record-skin-ver-1' },
    update: {},
    create: {
      id: 'milo-med-record-skin-ver-1',
      recordId: mr2.id,
      editorId: ownerUser.id,
      symptoms: 'Recurring itching and hair loss patches on the lower back and base of tail.',
      diagnosis: 'Suspected flea allergy dermatitis (under review).',
      treatmentPlan: 'Topical soothing spray, strict monthly flea prevention, monitor for spread.',
      notes: 'Second episode this summer; similar episode in June resolved with flea prevention.',
      isCurrent: true,
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
    },
  });

  await prisma.allergy.deleteMany({ where: { petId: milo.id } });
  await prisma.allergy.create({
    data: { petId: milo.id, allergen: 'Flea saliva', severity: 'MODERATE' },
  });

  await prisma.healthCondition.deleteMany({ where: { petId: milo.id } });
  await prisma.healthCondition.create({
    data: {
      petId: milo.id,
      name: 'Recurrent skin irritation',
      onsetDate: new Date('2026-08-20T00:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  await prisma.healthMetric.deleteMany({ where: { petId: milo.id } });
  await prisma.healthMetric.create({
    data: { petId: milo.id, metricType: 'WEIGHT', value: 4.2, unit: 'kg', takenAt: new Date('2026-06-12T10:15:00.000Z') },
  });
  await prisma.healthMetric.create({
    data: { petId: milo.id, metricType: 'WEIGHT', value: 4.6, unit: 'kg', takenAt: new Date('2026-08-28T14:15:00.000Z') },
  });
  console.log('Milo history seeded (2 consultations, 1 condition, 1 allergy, 2 metrics).');

  // ---- 2. Add specialized veterinarians for discovery ----
  console.log('Seeding discovery veterinarians...');
  const vetHash = await argon2.hash('VetPass123!', { type: argon2.argon2id });

  const demoVets = [
    {
      email: 'vet3@example.com', firstName: 'Diana', lastName: 'Prince',
      specialization: 'Dermatology', license: 'VET-LIC-00003', verified: true,
      clinics: [CLINIC_A],
    },
    {
      email: 'vet4@example.com', firstName: 'Eduardo', lastName: 'Reyes',
      specialization: 'Dentistry', license: 'VET-LIC-00004', verified: true,
      clinics: [CLINIC_B],
    },
    {
      email: 'vet5@example.com', firstName: 'Fatima', lastName: 'Khan',
      specialization: 'Cardiology', license: 'VET-LIC-00005', verified: true,
      clinics: [CLINIC_A, CLINIC_B],
    },
    {
      email: 'vet6@example.com', firstName: 'George', lastName: 'Lee',
      specialization: 'Exotic Animal Medicine', license: 'VET-LIC-00006', verified: false,
      clinics: [CLINIC_B],
    },
  ];

  for (const demo of demoVets) {
    const user = await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        email: demo.email,
        passwordHash: vetHash,
        role: 'VETERINARIAN',
        firstName: demo.firstName,
        lastName: demo.lastName,
        phone: '+1555000' + demo.license.slice(-1) + demo.license.slice(-1),
      },
    });
    const profile = await prisma.veterinarian.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialization: demo.specialization,
        licenseNumber: demo.license,
        isVerified: demo.verified,
        ...(demo.verified ? { verifiedAt: new Date('2026-02-01T09:00:00.000Z') } : {}),
      },
    });
    for (const clinicId of demo.clinics) {
      await prisma.vetClinicAssociation.upsert({
        where: { vetId_clinicId: { vetId: profile.id, clinicId } },
        update: {},
        create: { vetId: profile.id, clinicId, status: 'ACTIVE' },
      });
    }
    console.log(`  Dr. ${demo.firstName} ${demo.lastName} (${demo.specialization}) ready`);
  }

  const totalVets = await prisma.veterinarian.count();
  console.log(`Done. Veterinarians in discovery: ${totalVets}`);
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
