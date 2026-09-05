// Verify seeded data is served to dashboards via APIs
const BASE = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  return { cookie, data: await res.json() };
}

async function main() {
  const owner = await login('owner@example.com', 'OwnerPass123!');
  console.log('Logged in as:', owner.data.user.email, `(${owner.data.user.role})`);

  const petsData = await (await fetch(`${BASE}/api/pets`, { headers: { Cookie: owner.cookie } })).json();
  console.log('\nOwner dashboard - Pets:');
  (petsData.pets || []).forEach(p => console.log(`  - ${p.name} (${p.species}, ${p.breed}, ${p.gender}, ${p.weight}kg)`));

  const apptsData = await (await fetch(`${BASE}/api/appointments`, { headers: { Cookie: owner.cookie } })).json();
  console.log('\nOwner dashboard - Appointments:');
  (apptsData.appointments || []).forEach(a => {
    const vet = a.vet?.user ? `Dr. ${a.vet.user.firstName} ${a.vet.user.lastName}` : 'N/A';
    console.log(`  - ${a.pet?.name} | ${new Date(a.dateTime).toISOString().slice(0, 16).replace('T', ' ')} | ${a.status} | ${vet} | ${a.reason} @ ${a.clinic?.name}`);
  });

  const vet = await login('vet1@example.com', 'VetPass123!');
  const vetAppts = await (await fetch(`${BASE}/api/appointments`, { headers: { Cookie: vet.cookie } })).json();
  console.log(`\nVet dashboard (Dr. ${vet.data.user.firstName} ${vet.data.user.lastName}) sees ${vetAppts.appointments?.length || 0} appointments:`);
  (vetAppts.appointments || []).forEach(a => console.log(`  - ${a.pet?.name} | ${a.status} | owner: ${a.owner?.firstName} ${a.owner?.lastName}`));

  const clinic = await login('clinic@example.com', 'ClinicPass123!');
  const clinicAppts = await (await fetch(`${BASE}/api/appointments`, { headers: { Cookie: clinic.cookie } })).json();
  console.log(`\nClinic dashboard (${clinic.data.user.firstName} ${clinic.data.user.lastName}) sees ${clinicAppts.appointments?.length || 0} appointments at ${clinicAppts.appointments?.[0]?.clinic?.name}`);
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
