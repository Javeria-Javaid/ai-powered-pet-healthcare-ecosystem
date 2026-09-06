// Diagnostic: why does the AI Health Summary button click not render the interpretation?
const puppeteer = require('puppeteer');
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loginCookie() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@example.com', password: 'OwnerPass123!' }),
  });
  const pair = res.headers.get('set-cookie').split(';')[0];
  const idx = pair.indexOf('=');
  return { name: pair.slice(0, idx), value: pair.slice(idx + 1) };
}

(async () => {
  const cookie = await loginCookie();
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setCookie({ name: cookie.name, value: cookie.value, domain: 'localhost', path: '/' });

  page.on('console', (msg) => console.log(`[page:${msg.type()}]`, msg.text().slice(0, 300)));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message.slice(0, 500)));
  page.on('response', (res) => {
    if (res.url().includes('health-summary')) {
      console.log(`[net] ${res.status()} ${res.url()}`);
    }
  });

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForFunction(() => document.body.innerText.includes('My Pets'), { timeout: 30000 });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('My Pets'));
    btn.click();
  });
  await page.waitForFunction(() => document.body.innerText.includes('My Pets Portfolio'), { timeout: 15000 });

  const petOk = await page.evaluate(() => {
    const h4 = Array.from(document.querySelectorAll('h4')).find((h) => h.textContent.trim() === 'Milo');
    if (!h4) return 'no h4';
    let el = h4.parentElement;
    while (el && el !== document.body) {
      if (el.tagName === 'BUTTON' || (el.tagName === 'DIV' && el.className.includes('cursor-pointer'))) {
        el.click();
        return 'clicked ' + el.tagName;
      }
      el = el.parentElement;
    }
    return 'no clickable';
  });
  console.log('pet select:', petOk);
  await page.waitForFunction(() => document.body.innerText.includes('AI Health Summary'), { timeout: 15000 });

  const before = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Generate Summary'));
    return btn ? { found: true, disabled: btn.disabled, text: btn.textContent.trim() } : { found: false };
  });
  console.log('generate button before click:', JSON.stringify(before));

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Generate Summary'));
    btn.click();
  });
  console.log('clicked. Waiting 40s for outcome...');

  for (let i = 0; i < 8; i++) {
    await sleep(5000);
    const state = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Generate Summary') || b.textContent.includes('Generating') || b.textContent.includes('Regenerate'));
      const body = document.body.innerText;
      return {
        btnText: btn ? btn.textContent.trim() : null,
        hasAiLabel: body.includes('AI-Generated Interpretation'),
        hasStoredFacts: body.includes('Stored Health Facts'),
        hasError: body.includes('Connection error generating') || body.includes('Could not generate'),
        snippet: body.includes('Analyzing') ? 'still-loading' : 'idle',
      };
    });
    console.log(`t=${(i + 1) * 5}s`, JSON.stringify(state));
    if (state.hasAiLabel) break;
  }

  await browser.close();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
