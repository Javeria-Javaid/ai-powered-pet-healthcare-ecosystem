// One-time demo data: vaccination + medication tracking entries for the demo pet Milo
const BASE = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return { cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

async function main() {
  const owner = await login('owner@example.com', 'OwnerPass123!');

  const petsRes = await fetch(`${BASE}/api/pets`, { headers: { Cookie: owner.cookie } });
  const pets = (await petsRes.json()).pets || [];
  const milo = pets.find(p => p.name === 'Milo');
  if (!milo) throw new Error('Milo not found');

  // Avoid duplicates if re-run
  const vacRes = await fetch(`${BASE}/api/pets/${milo.id}/vaccinations`, { headers: { Cookie: owner.cookie } });
  const existing = (await vacRes.json()).vaccinations || [];
  if (existing.some(v => v.vaccineName === 'Rabies')) {
    console.log('Demo vaccinations already seeded, skipping.');
    return;
  }

  const day = 86400000;
  const iso = (t) => new Date(t).toISOString().split('T')[0];

  const v1 = await fetch(`${BASE}/api/pets/${milo.id}/vaccinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
    body: JSON.stringify({
      vaccineName: 'Rabies',
      administeredDate: iso(Date.now() - 14 * day),
      dueDate: iso(Date.now() + 45 * day),
      vetName: 'Dr. Alice Smith',
    }),
  });
  console.log('Rabies:', v1.status, JSON.stringify(await v1.json()).slice(0, 150));

  const v2 = await fetch(`${BASE}/api/pets/${milo.id}/vaccinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
    body: JSON.stringify({
      vaccineName: 'DHPP',
      administeredDate: iso(Date.now() - 180 * day),
      vetName: 'Dr. Alice Smith',
    }),
  });
  console.log('DHPP:', v2.status, JSON.stringify(await v2.json()).slice(0, 150));

  const m1 = await fetch(`${BASE}/api/pets/${milo.id}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: owner.cookie },
    body: JSON.stringify({
      medicationName: 'Metacam',
      dosage: '1.5 mg',
      frequency: 'Once daily',
      startDate: iso(Date.now() - 2 * day),
      endDate: iso(Date.now() + 12 * day),
    }),
  });
  console.log('Metacam:', m1.status, JSON.stringify(await m1.json()).slice(0, 150));

  const rem = await fetch(`${BASE}/api/reminders`, { headers: { Cookie: owner.cookie } });
  console.log('Reminders now:', JSON.stringify(((await rem.json()).reminders || []).map(r => r.title)));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
