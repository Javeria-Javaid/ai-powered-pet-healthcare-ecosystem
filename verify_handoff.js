// Verification test for PETIVA handoff items.
// Run against the live dev server on http://localhost:3000
// Tests: UTF-8 emoji persistence, past-date booking rejection, cancel flow, upcoming appointment query.

const BASE = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const cookie = res.headers.get('set-cookie')?.split(';')[0];
  return { cookie, data: await res.json() };
}

function authed(cookie) {
  return { 'Content-Type': 'application/json', Cookie: cookie };
}

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name} ${detail ? '-- ' + detail : ''}`);
  }
}

async function main() {
  console.log('=== TEST 1: Login as owner ===');
  const owner = await login('owner@example.com', 'OwnerPass123!');
  check('Owner login succeeds', owner.data.success === true);

  console.log('=== TEST 2: UTF-8 emoji pet name on Supabase ===');
  let petId = null;
  try {
    const res = await fetch(`${BASE}/api/pets`, {
      method: 'POST',
      headers: authed(owner.cookie),
      body: JSON.stringify({
        name: 'Löna 🐕',
        species: 'Dog',
        breed: 'Test Breed',
        gender: 'Female',
        weight: '5.5',
      }),
    });
    const data = await res.json();
    check('Pet with emoji name saves without encoding error', res.status === 201 && data.success === true, JSON.stringify(data).slice(0, 200));

    if (data.success) {
      petId = data.pet.id;
      // Read it back and verify the emoji survived the round trip
      const getRes = await fetch(`${BASE}/api/pets`, { headers: authed(owner.cookie) });
      const getData = await getRes.json();
      const saved = getData.pets.find(p => p.id === petId);
      console.log(`  Inserted: "Löna 🐕" | Read back from DB: "${saved?.name}" | Char codes: ${[...(saved?.name || '')].map(c => c.codePointAt(0).toString(16)).join(' ')}`);
      check('Emoji name round-trips correctly from DB', saved && saved.name === 'Löna 🐕', `Got: ${saved?.name}`);
    }
  } catch (e) {
    check('Pet with emoji name saves without encoding error', false, e.message);
  }

  console.log('=== TEST 3: Past-date appointment rejection (API) ===');
  // Find a vet to book with
  const discRes = await fetch(`${BASE}/api/vet/discovery`, { headers: authed(owner.cookie) });
  const disc = await discRes.json();
  const vet = disc.veterinarians?.[0];
  check('Vet discovery returns vets', !!vet, JSON.stringify(disc).slice(0, 200));
  const clinicId = vet?.clinics?.[0]?.id;

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const pastRes = await fetch(`${BASE}/api/appointments`, {
    method: 'POST',
    headers: authed(owner.cookie),
    body: JSON.stringify({
      petId,
      vetId: vet.id,
      clinicId,
      dateTime: yesterday,
      reason: 'Past-date test (should be rejected)',
    }),
  });
  const pastData = await pastRes.json();
  check('Past-date booking via REST API is rejected', pastRes.status === 400 && pastData.success === false, JSON.stringify(pastData).slice(0, 200));

  console.log('=== TEST 4: Future booking works, then cancel (soft-cancel) ===');
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  nextWeek.setUTCHours(10, 0, 0, 0); // 10 AM UTC = 3 PM Karachi, within working hours
  let apptId = null;
  const bookRes = await fetch(`${BASE}/api/appointments`, {
    method: 'POST',
    headers: authed(owner.cookie),
    body: JSON.stringify({
      petId,
      vetId: vet.id,
      clinicId,
      dateTime: nextWeek.toISOString(),
      reason: 'Future booking test',
    }),
  });
  const bookData = await bookRes.json();
  check('Future booking succeeds', bookRes.status === 201 && bookData.success === true, JSON.stringify(bookData).slice(0, 300));
  if (bookData.success) {
    apptId = bookData.appointment.id;
    check('New appointment starts as REQUESTED', bookData.appointment.status === 'REQUESTED');

    // Cancel it
    const cancelRes = await fetch(`${BASE}/api/appointments/${apptId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const cancelData = await cancelRes.json();
    check('Owner can cancel own REQUESTED appointment', cancelRes.status === 200 && cancelData.success === true, JSON.stringify(cancelData).slice(0, 300));
    check('Cancel is a soft-cancel (status CANCELLED, record still exists)', cancelData.appointment?.status === 'CANCELLED');
  }

  console.log('=== TEST 5: Upcoming appointment includes REQUESTED ===');
  const nextWeek2 = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
  nextWeek2.setUTCHours(11, 0, 0, 0);
  const bookRes2 = await fetch(`${BASE}/api/appointments`, {
    method: 'POST',
    headers: authed(owner.cookie),
    body: JSON.stringify({
      petId,
      vetId: vet.id,
      clinicId,
      dateTime: nextWeek2.toISOString(),
      reason: 'Upcoming REQUESTED test',
    }),
  });
  const bookData2 = await bookRes2.json();
  if (bookData2.success) {
    const listRes = await fetch(`${BASE}/api/appointments`, { headers: authed(owner.cookie) });
    const listData = await listRes.json();
    const future = (listData.appointments || []).filter(a =>
      new Date(a.dateTime) > new Date() && (a.status === 'REQUESTED' || a.status === 'CONFIRMED')
    );
    check('REQUESTED future appointment appears in owner list', future.some(a => a.id === bookData2.appointment.id));

    // Clean up: cancel this appointment too so state stays clean for manual testing
    await fetch(`${BASE}/api/appointments/${bookData2.appointment.id}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
  } else {
    check('REQUESTED future appointment appears in owner list', false, JSON.stringify(bookData2).slice(0, 200));
  }

  console.log('=== TEST 6: Authorization - cross-owner cancel is FORBIDDEN ===');
  const intruderEmail = `intruder${Date.now()}@test.com`;
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: intruderEmail,
      password: 'Intruder123!',
      firstName: 'In',
      lastName: 'Truder',
      role: 'PET_OWNER',
    }),
  });
  let cookie2 = regRes.headers.get('set-cookie')?.split(';')[0];
  if (!cookie2) {
    const intruder = await login(intruderEmail, 'Intruder123!').catch(() => null);
    cookie2 = intruder?.cookie;
  }
  if (cookie2 && apptId) {
    const badCancel = await fetch(`${BASE}/api/appointments/${apptId}`, {
      method: 'PUT',
      headers: authed(cookie2),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    check('Cross-owner cancel is FORBIDDEN (403)', badCancel.status === 403, `Got ${badCancel.status}`);
  } else {
    console.log('  SKIP: could not establish intruder session');
  }

  console.log('=== TEST 8: Reschedule (slot options, owner-only, resets to REQUESTED) ===');
  const karachiFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' });
  const reschedBase = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
  reschedBase.setUTCHours(5, 0, 0, 0); // 10 AM Karachi, within working hours
  const reschedBookRes = await fetch(`${BASE}/api/appointments`, {
    method: 'POST',
    headers: authed(owner.cookie),
    body: JSON.stringify({
      petId,
      vetId: vet.id,
      clinicId,
      dateTime: reschedBase.toISOString(),
      reason: 'Reschedule test',
    }),
  });
  const reschedBookData = await reschedBookRes.json();
  if (reschedBookData.success) {
    const raId = reschedBookData.appointment.id;

    // A far-future date for slot-option checks (nothing else booked that day)
    const targetDate = karachiFmt.format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    // 8.1 Slot options reject invalid date format
    const badSlots = await fetch(`${BASE}/api/appointments/${raId}/slots?date=not-a-date`, { headers: authed(owner.cookie) });
    check('Slot options reject invalid date (400)', badSlots.status === 400, `Got ${badSlots.status}`);

    // 8.2 Slot options reject past date
    const pastSlotsDate = karachiFmt.format(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    const pastSlots = await fetch(`${BASE}/api/appointments/${raId}/slots?date=${pastSlotsDate}`, { headers: authed(owner.cookie) });
    check('Slot options reject past date (400)', pastSlots.status === 400, `Got ${pastSlots.status}`);

    // 8.3 Slot options are owner-only (vet gets 403)
    const vetUser = await login('vet1@example.com', 'VetPass123!');
    const vetSlots = await fetch(`${BASE}/api/appointments/${raId}/slots?date=${targetDate}`, { headers: authed(vetUser.cookie) });
    check('Vet cannot fetch slot options (403)', vetSlots.status === 403, `Got ${vetSlots.status}`);

    // 8.4 Slot options are private to the appointment's owner
    if (cookie2) {
      const badSlotsOwner = await fetch(`${BASE}/api/appointments/${raId}/slots?date=${targetDate}`, { headers: authed(cookie2) });
      check('Cross-owner slot options FORBIDDEN (403)', badSlotsOwner.status === 403, `Got ${badSlotsOwner.status}`);
    }

    // 8.5 Slot grid: 9 AM - 5 PM hourly options, all available on the fresh date
    const slotsRes = await fetch(`${BASE}/api/appointments/${raId}/slots?date=${targetDate}`, { headers: authed(owner.cookie) });
    const slotsData = await slotsRes.json();
    check('Slot options returned for a future date', slotsRes.status === 200 && slotsData.success === true, JSON.stringify(slotsData).slice(0, 200));
    check('Slot grid is exactly 8 hourly options (9 AM - 4 PM)', slotsData.slots?.length === 8, `Got ${slotsData.slots?.length}`);
    check('All slots available when the vet is free', slotsData.slots?.every(s => s.available === true));

    // 8.6 Booked slots are excluded: book a second appointment at 11 AM on the same date
    const busySlot = slotsData.slots?.find(s => s.hour === 11);
    const ra2Res = await fetch(`${BASE}/api/appointments`, {
      method: 'POST',
      headers: authed(owner.cookie),
      body: JSON.stringify({
        petId,
        vetId: vet.id,
        clinicId,
        dateTime: busySlot.iso,
        reason: 'Slot busy-marker test',
      }),
    });
    const ra2Data = await ra2Res.json();
    const slotsRes2 = await fetch(`${BASE}/api/appointments/${raId}/slots?date=${targetDate}`, { headers: authed(owner.cookie) });
    const slotsData2 = await slotsRes2.json();
    const busyNow = slotsData2.slots?.find(s => s.hour === 11);
    const freeStill = slotsData2.slots?.find(s => s.hour === 14);
    check('Booked slot is marked unavailable in options', ra2Data.success === true && busyNow?.available === false, JSON.stringify(busyNow));
    check('Other slots remain available', freeStill?.available === true, JSON.stringify(freeStill));

    // 8.7 Past-date reschedule rejected
    const pastRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: yesterday }),
    });
    check('Past-date reschedule is rejected (400)', pastRs.status === 400, `Got ${pastRs.status}`);

    // 8.8 Off-hours reschedule rejected (working hours 9 AM - 5 PM Karachi)
    const offHours = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    offHours.setUTCHours(20, 0, 0, 0); // 1 AM Karachi next day
    const offRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: offHours.toISOString() }),
    });
    const offData = await offRs.json();
    check('Off-hours reschedule rejected with OUTSIDE_WORKING_HOURS (400)', offRs.status === 400 && offData.error?.code === 'OUTSIDE_WORKING_HOURS', JSON.stringify(offData).slice(0, 200));

    // 8.9 Same-time reschedule rejected
    const sameRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: reschedBase.toISOString() }),
    });
    check('Same-time reschedule is rejected (400)', sameRs.status === 400, `Got ${sameRs.status}`);

    // 8.10 Valid reschedule to a slot from the options: status resets to REQUESTED
    const pickSlot = freeStill; // 2 PM Karachi
    const okRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: pickSlot.iso }),
    });
    const okData = await okRs.json();
    check('Owner can reschedule to a slot option', okRs.status === 200 && okData.success === true, JSON.stringify(okData).slice(0, 200));
    check('Reschedule resets status to REQUESTED', okData.appointment?.status === 'REQUESTED');
    check('Reschedule updates dateTime to the chosen slot', okData.appointment && new Date(okData.appointment.dateTime).getTime() === new Date(pickSlot.iso).getTime());

    // 8.11 Vet cannot reschedule (owner-only action)
    const vetRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(vetUser.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: pickSlot.iso }),
    });
    check('Vet cannot reschedule (403)', vetRs.status === 403, `Got ${vetRs.status}`);

    // 8.12 Cross-owner reschedule forbidden
    if (cookie2) {
      const badRs = await fetch(`${BASE}/api/appointments/${raId}`, {
        method: 'PUT',
        headers: authed(cookie2),
        body: JSON.stringify({ action: 'RESCHEDULE', dateTime: pickSlot.iso }),
      });
      check('Cross-owner reschedule is FORBIDDEN (403)', badRs.status === 403, `Got ${badRs.status}`);
    }

    // 8.13 Cancelled appointment cannot be rescheduled
    await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    const cancelledRs = await fetch(`${BASE}/api/appointments/${raId}`, {
      method: 'PUT',
      headers: authed(owner.cookie),
      body: JSON.stringify({ action: 'RESCHEDULE', dateTime: pickSlot.iso }),
    });
    check('Cancelled appointment cannot be rescheduled (400)', cancelledRs.status === 400, `Got ${cancelledRs.status}`);

    // Clean up the busy-marker appointment
    if (ra2Data.success) {
      await fetch(`${BASE}/api/appointments/${ra2Data.appointment.id}`, {
        method: 'PUT',
        headers: authed(owner.cookie),
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
    }
  } else {
    check('Reschedule test booking created', false, JSON.stringify(reschedBookData).slice(0, 200));
  }

  console.log('=== TEST 9: Cleanup - delete test pet ===');
  if (petId) {
    const delRes = await fetch(`${BASE}/api/pets/${petId}`, { method: 'DELETE', headers: authed(owner.cookie) });
    check('Test pet deleted', delRes.ok);
  }

  console.log(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
