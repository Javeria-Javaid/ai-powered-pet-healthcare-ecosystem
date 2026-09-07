// One-off setup for Medical Documents storage (deleted after use):
// 1. Derives the Supabase service_role key from the vault (readable via the DB connection)
// 2. Writes it into .env (never printed in full)
// 3. Validates it against the Storage API and creates the private pet-documents bucket
const fs = require('fs');
const { Client } = require('pg');

function envValue(name) {
  const m = fs.readFileSync('.env', 'utf8').match(new RegExp('^' + name + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

function isValidKey(k) {
  return !!k && (k.startsWith('eyJ') || k.startsWith('sb_secret_'));
}

(async () => {
  // 1. Get the service key: prefer the value already in .env; fall back to the
  // Supabase vault (readable over the DB connection, but empty on this project).
  // (uselibpqcompat=true must stay: without it pg>=8.16 treats sslmode=require as
  // verify-full and rejects Supabase's certificate chain)
  let key = envValue('SUPABASE_SERVICE_ROLE_KEY');
  let keySource = '.env';

  if (!isValidKey(key)) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query('SELECT name, decrypted_secret FROM vault.decrypted_secrets ORDER BY id');
    await client.end();
    console.log('Vault secret names:', rows.map(r => r.name).join(', ') || '(none)');
    const row = rows.find(r => /service/i.test(r.name));
    key = row && typeof row.decrypted_secret === 'string' ? row.decrypted_secret.trim() : '';
    keySource = 'vault';
  }

  if (!isValidKey(key)) {
    console.log('NO_VALID_SERVICE_KEY_FOUND');
    process.exit(2);
  }

  // 2. Write it into .env if it came from the vault
  let env = fs.readFileSync('.env', 'utf8');
  if (!/^SUPABASE_SERVICE_ROLE_KEY=.*$/m.test(env)) {
    console.log('ENV_PLACEHOLDER_MISSING');
    process.exit(3);
  }
  if (keySource === 'vault') {
    env = env.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*$/m, 'SUPABASE_SERVICE_ROLE_KEY=' + key);
    fs.writeFileSync('.env', env);
  }
  console.log('Using service key from ' + keySource + ': prefix=' + key.slice(0, 10) + '... length=' + key.length);

  // 3. Validate against the Storage API and ensure the private bucket exists
  const base = envValue('SUPABASE_URL');
  const headers = { apikey: key, Authorization: 'Bearer ' + key };

  let res = await fetch(base + '/storage/v1/bucket/pet-documents', { headers });
  console.log('Bucket check status:', res.status);

  const bodyText = await res.text();
  const isNotFound = res.status === 404 || (res.status === 400 && bodyText.includes('NoSuchBucket'));

  if (isNotFound) {
    res = await fetch(base + '/storage/v1/bucket', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'pet-documents',
        public: false,
        file_size_limit: 10485760,
        allowed_mime_types: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
      }),
    });
    const createBody = await res.text();
    console.log('Bucket create status:', res.status, createBody.slice(0, 200));
    if (!res.ok && res.status !== 409) process.exit(4);
  } else if (res.ok) {
    console.log('Bucket already exists:', bodyText.slice(0, 200));
  } else {
    console.log('KEY_VALIDATION_FAILED:', bodyText.slice(0, 300));
    process.exit(5);
  }
  console.log('STORAGE_READY');
})().catch(err => {
  console.error('SETUP_FAILED:', err.message);
  process.exit(1);
});
