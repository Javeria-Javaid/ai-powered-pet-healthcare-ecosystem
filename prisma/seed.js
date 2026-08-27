const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const argon2 = require('argon2');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

// Parse direct TCP connection string from prisma+postgres API key if present (Prisma dev mode)
if (connectionString && connectionString.startsWith('prisma+postgres://')) {
  const urlObj = new URL(connectionString);
  const apiKey = urlObj.searchParams.get('api_key');
  if (apiKey) {
    try {
      const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
      const params = JSON.parse(decoded);
      if (params.databaseUrl) {
        connectionString = params.databaseUrl;
      }
    } catch (e) {
      console.error("Failed to decode prisma+postgres API key:", e.message);
    }
  }
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting database seeding...');

  // 1. Password Hashing (using Argon2id profile)
  console.log('Generating password hashes...');
  const ownerHash = await argon2.hash('OwnerPass123!', { type: argon2.argon2id });
  const vet1Hash = await argon2.hash('VetPass123!', { type: argon2.argon2id });
  const vet2Hash = await argon2.hash('VetPass123!', { type: argon2.argon2id });
  const clinicHash = await argon2.hash('ClinicPass123!', { type: argon2.argon2id });
  const adminHash = await argon2.hash('AdminPass123!', { type: argon2.argon2id });

  // 3. Seed Clinics (Seeded first to support referential constraints)
  console.log('Seeding Clinics...');
  const clinicA = await prisma.clinic.upsert({
    where: { id: 'clinic-a-uuid-placeholder' },
    update: {},
    create: {
      id: 'clinic-a-uuid-placeholder',
      name: 'Green Valley Veterinary Hospital',
      address: '100 Health Way, Green Valley',
      phone: '+1555400100',
      isVerified: true,
    },
  });

  const clinicB = await prisma.clinic.upsert({
    where: { id: 'clinic-b-uuid-placeholder' },
    update: {},
    create: {
      id: 'clinic-b-uuid-placeholder',
      name: 'Downtown Pet Care Clinic',
      address: '500 Main Street, Metropolis',
      phone: '+1555400200',
      isVerified: true,
    },
  });

  // 2. Seed Users
  console.log('Seeding Users...');
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      passwordHash: ownerHash,
      role: 'PET_OWNER',
      firstName: 'Jane',
      lastName: 'Owner',
      phone: '+1555123456',
    },
  });

  const vet1User = await prisma.user.upsert({
    where: { email: 'vet1@example.com' },
    update: {},
    create: {
      email: 'vet1@example.com',
      passwordHash: vet1Hash,
      role: 'VETERINARIAN',
      firstName: 'Alice',
      lastName: 'Smith',
      phone: '+1555987654',
    },
  });

  const vet2User = await prisma.user.upsert({
    where: { email: 'vet2@example.com' },
    update: {},
    create: {
      email: 'vet2@example.com',
      passwordHash: vet2Hash,
      role: 'VETERINARIAN',
      firstName: 'Bob',
      lastName: 'Jones',
      phone: '+1555111222',
    },
  });

  const clinicUser = await prisma.user.upsert({
    where: { email: 'clinic@example.com' },
    update: {
      clinicId: 'clinic-a-uuid-placeholder',
    },
    create: {
      email: 'clinic@example.com',
      passwordHash: clinicHash,
      role: 'CLINIC_ADMIN',
      firstName: 'Charlie',
      lastName: 'Manager',
      phone: '+1555333444',
      clinicId: 'clinic-a-uuid-placeholder',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'PLATFORM_ADMIN',
      firstName: 'David',
      lastName: 'Platform',
      phone: '+1555555666',
    },
  });

  // 4. Seed Veterinarian Profiles (Verified & Unverified)
  console.log('Seeding Veterinarian Profiles...');
  const vet1Profile = await prisma.veterinarian.upsert({
    where: { userId: vet1User.id },
    update: {},
    create: {
      userId: vet1User.id,
      specialization: 'Small Animal Surgery',
      licenseNumber: 'VET-LIC-00001',
      isVerified: true,
      verifiedAt: new Date('2026-01-01T09:00:00.000Z'),
      verifiedById: adminUser.id,
    },
  });

  const vet2Profile = await prisma.veterinarian.upsert({
    where: { userId: vet2User.id },
    update: {},
    create: {
      userId: vet2User.id,
      specialization: 'Feline Internal Medicine',
      licenseNumber: 'VET-LIC-00002',
      isVerified: false,
      verifiedAt: null,
      verifiedById: null,
    },
  });

  // 5. Seed Veterinarian-Clinic Associations (Many-to-Many)
  console.log('Seeding Vet-Clinic Associations...');
  await prisma.vetClinicAssociation.upsert({
    where: { vetId_clinicId: { vetId: vet1Profile.id, clinicId: clinicA.id } },
    update: {},
    create: {
      vetId: vet1Profile.id,
      clinicId: clinicA.id,
      status: 'ACTIVE',
    },
  });

  await prisma.vetClinicAssociation.upsert({
    where: { vetId_clinicId: { vetId: vet1Profile.id, clinicId: clinicB.id } },
    update: {},
    create: {
      vetId: vet1Profile.id,
      clinicId: clinicB.id,
      status: 'ACTIVE',
    },
  });

  await prisma.vetClinicAssociation.upsert({
    where: { vetId_clinicId: { vetId: vet2Profile.id, clinicId: clinicA.id } },
    update: {},
    create: {
      vetId: vet2Profile.id,
      clinicId: clinicA.id,
      status: 'ACTIVE',
    },
  });

  // 6. Seed Pets (owned by owner@example.com)
  console.log('Seeding Pets...');
  const pet1 = await prisma.pet.upsert({
    where: { id: 'pet-1-luna-uuid-placeholder' },
    update: {},
    create: {
      id: 'pet-1-luna-uuid-placeholder',
      ownerId: ownerUser.id,
      name: 'Luna',
      species: 'Dog',
      breed: 'Golden Retriever',
      gender: 'Female',
      dateOfBirth: new Date('2024-06-15T00:00:00.000Z'),
      weight: 28.5,
    },
  });

  const pet2 = await prisma.pet.upsert({
    where: { id: 'pet-2-milo-uuid-placeholder' },
    update: {},
    create: {
      id: 'pet-2-milo-uuid-placeholder',
      ownerId: ownerUser.id,
      name: 'Milo',
      species: 'Cat',
      breed: 'Siamese',
      gender: 'Male',
      dateOfBirth: new Date('2025-02-10T00:00:00.000Z'),
      weight: 4.2,
    },
  });

  // 7. Seed Appointments (Consent/Access Testing targets)
  console.log('Seeding Appointments...');
  // Confirmed historical appointment for Vet 1 -> Luna (Access granted)
  const appt1 = await prisma.appointment.upsert({
    where: { id: 'appt-1-confirmed-placeholder' },
    update: {},
    create: {
      id: 'appt-1-confirmed-placeholder',
      petId: pet1.id,
      ownerId: ownerUser.id,
      vetId: vet1Profile.id,
      clinicId: clinicA.id,
      dateTime: new Date('2026-08-20T10:00:00.000Z'),
      reason: 'Routine checkup & vaccinations',
      status: 'CONFIRMED',
    },
  });

  // Requested future appointment for Vet 2 -> Milo (Unconfirmed/Pending status)
  const appt2 = await prisma.appointment.upsert({
    where: { id: 'appt-2-requested-placeholder' },
    update: {},
    create: {
      id: 'appt-2-requested-placeholder',
      petId: pet2.id,
      ownerId: ownerUser.id,
      vetId: vet2Profile.id,
      clinicId: clinicA.id,
      dateTime: new Date('2026-09-01T14:00:00.000Z'),
      reason: 'Minor skin irritation',
      status: 'REQUESTED',
    },
  });

  // 8. Seed Medical Records (Versioned Revisions)
  console.log('Seeding Medical Records...');
  const record1 = await prisma.medicalRecord.upsert({
    where: { id: 'med-record-1-placeholder' },
    update: {},
    create: {
      id: 'med-record-1-placeholder',
      petId: pet1.id,
      vetId: vet1Profile.id,
      clinicId: clinicA.id,
      createdAt: new Date('2026-08-20T11:00:00.000Z'),
    },
  });

  // Initial Record Version
  const record1Ver1 = await prisma.medicalRecordVersion.upsert({
    where: { id: 'med-record-1-ver-1-placeholder' },
    update: {},
    create: {
      id: 'med-record-1-ver-1-placeholder',
      recordId: record1.id,
      editorId: vet1User.id,
      symptoms: 'Mild limp in front left paw, slightly lethargic.',
      diagnosis: 'Potential light muscle strain.',
      treatmentPlan: 'Rest for 3 days, avoid long walks.',
      notes: 'No obvious swelling or fracture detected.',
      isCurrent: false, // Replaced by Ver 2
      createdAt: new Date('2026-08-20T11:05:00.000Z'),
    },
  });

  // Addendum / Corrected Version (Current)
  const record1Ver2 = await prisma.medicalRecordVersion.upsert({
    where: { id: 'med-record-1-ver-2-placeholder' },
    update: {},
    create: {
      id: 'med-record-1-ver-2-placeholder',
      recordId: record1.id,
      editorId: vet1User.id,
      symptoms: 'Mild limp in front left paw (fully resolved).',
      diagnosis: 'Minor muscle strain (fully resolved).',
      treatmentPlan: 'Light activity can resume.',
      notes: 'Follow-up call with owner confirmed normal gait.',
      isCurrent: true,
      createdAt: new Date('2026-08-23T15:00:00.000Z'),
    },
  });

  // 9. Prescription, Vaccination, Medication, Allergy, Condition, Metrics
  console.log('Seeding Health Metrics & Preventative Data...');
  // Delete existing dependent entries to prevent duplicate primary key collisions in multiple runs
  await prisma.prescription.deleteMany({ where: { recordId: record1.id } });
  await prisma.prescription.create({
    data: {
      recordId: record1.id,
      medicationName: 'Dog-Safe Anti-inflammatory',
      dosage: '1 tablet daily',
      frequency: 'Once a day',
      startDate: new Date('2026-08-20T00:00:00.000Z'),
      endDate: new Date('2026-08-23T00:00:00.000Z'),
      instructions: 'Give with food.',
    },
  });

  await prisma.vaccination.deleteMany({ where: { petId: pet1.id } });
  await prisma.vaccination.create({
    data: {
      petId: pet1.id,
      vaccineName: 'DHPP Booster',
      administeredDate: new Date('2026-08-20T10:30:00.000Z'),
      dueDate: new Date('2027-08-20T10:30:00.000Z'),
      vetName: 'Dr. Alice Smith',
    },
  });

  await prisma.medication.deleteMany({ where: { petId: pet1.id } });
  await prisma.medication.create({
    data: {
      petId: pet1.id,
      medicationName: 'Joint Supplement Chewables',
      dosage: '1 chewable chew',
      frequency: 'Every morning',
      startDate: new Date('2026-08-20T00:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  await prisma.allergy.deleteMany({ where: { petId: pet1.id } });
  await prisma.allergy.create({
    data: {
      petId: pet1.id,
      allergen: 'Penicillin',
      severity: 'HIGH',
    },
  });

  await prisma.healthCondition.deleteMany({ where: { petId: pet1.id } });
  await prisma.healthCondition.create({
    data: {
      petId: pet1.id,
      name: 'Front Left Paw Limp',
      onsetDate: new Date('2026-08-19T00:00:00.000Z'),
      status: 'RESOLVED',
    },
  });

  await prisma.healthMetric.deleteMany({ where: { petId: pet1.id } });
  await prisma.healthMetric.create({
    data: {
      petId: pet1.id,
      metricType: 'WEIGHT',
      value: 28.5,
      unit: 'kg',
      takenAt: new Date('2026-08-20T10:15:00.000Z'),
    },
  });

  // 10. Document metadata
  console.log('Seeding Document Metadata...');
  await prisma.document.deleteMany({ where: { petId: pet1.id } });
  await prisma.document.create({
    data: {
      petId: pet1.id,
      uploaderId: ownerUser.id,
      ossKey: 'uploads/pets/pet-1-luna-uuid-placeholder/xray_paw.jpg',
      fileName: 'luna_left_paw_xray.jpg',
      fileType: 'image/jpeg',
    },
  });

  // 11. Audit Logs
  console.log('Seeding Audit Logs...');
  await prisma.auditLog.deleteMany({ where: { userId: vet1User.id } });
  await prisma.auditLog.create({
    data: {
      userId: vet1User.id,
      action: 'RECORD_CREATED',
      entity: 'MedicalRecord',
      entityId: record1.id,
      payload: JSON.stringify({ petId: pet1.id, diagnosis: 'Potential light muscle strain' }),
      timestamp: new Date('2026-08-20T11:05:00.000Z'),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: vet1User.id,
      action: 'RECORD_CORRECTED',
      entity: 'MedicalRecordVersion',
      entityId: record1Ver2.id,
      payload: JSON.stringify({ previousVersionId: record1Ver1.id, status: 'resolved' }),
      timestamp: new Date('2026-08-23T15:00:00.000Z'),
    },
  });

  console.log('Database seeding completed successfully! 🎉');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
