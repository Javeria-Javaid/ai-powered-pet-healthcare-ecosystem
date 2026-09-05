// Evidence script: past-date rejection inside the AI assistant's booking tools
// (check_slots and create_booking) via the real /api/ai/chat NDJSON stream.
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

async function chat(cookie, petId, message, conversationId) {
  const res = await fetch(`${BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ petId, message, ...(conversationId ? { conversationId } : {}) }),
  });
  if (!res.ok) {
    console.log(`  [HTTP ${res.status}]`, await res.text());
    return null;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let final = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const evt = JSON.parse(line);
        if (evt.type === 'status') console.log(`  [assistant status] ${evt.message}`);
        if (evt.type === 'result') final = evt;
      } catch { /* partial line */ }
    }
  }
  return final;
}

async function main() {
  const owner = await login('owner@example.com', 'OwnerPass123!');

  const petsRes = await fetch(`${BASE}/api/pets`, { headers: { Cookie: owner.cookie } });
  const pet = (await petsRes.json()).pets?.[0];

  const discRes = await fetch(`${BASE}/api/vet/discovery`, { headers: { Cookie: owner.cookie } });
  const vet = (await discRes.json()).veterinarians?.[0];
  const vetName = `${vet?.firstName} ${vet?.lastName}`;

  console.log(`Using pet "${pet?.name}" and vet "Dr. ${vetName}"`);
  console.log('\n=== TRANSCRIPT A: ask the AI to CHECK SLOTS for a past date (Sept 1, 2026) ===');
  const a = await chat(owner.cookie, pet.id, `Check the available appointment slots for ${pet.name} with Dr. ${vetName} on September 1, 2026.`);
  console.log(`  [assistant reply] ${a?.message}`);

  console.log('\n=== TRANSCRIPT B: ask the AI to BOOK for a past date (Sept 1, 2026), then confirm ===');
  let convId = '';
  const b1 = await chat(owner.cookie, pet.id, `I want to book an appointment for ${pet.name} with Dr. ${vetName} on September 1, 2026 at 2:00 PM for a general checkup.`);
  convId = b1?.conversationId || '';
  console.log(`  [assistant reply] ${b1?.message}`);
  const b2 = await chat(owner.cookie, pet.id, 'Yes, I confirm. Please book it now.', convId);
  console.log(`  [assistant reply] ${b2?.message}`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
