const http = require('http');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, incomingHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : '';
    
    const headers = { ...incomingHeaders };
    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: json || data });
      });
    });

    req.on('error', (err) => { reject(err); });
    if (body) { req.write(postData); }
    req.end();
  });
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const cookie of cookies) {
    const parts = cookie.split(';');
    for (const part of parts) {
      const [key, val] = part.trim().split('=');
      if (key === name) return val;
    }
  }
  return null;
}

async function runTests() {
  console.log("====================================================");
  console.log("RUNNING AI INTEGRATION TESTS");
  console.log("====================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Landing Chat Widget API (OpenRouter)
    console.log("\n[Test 1: Public Landing Chat Widget]");
    const landingRes = await makeRequest('POST', '/api/landing-chat', {
      messages: [{ role: 'user', content: 'What is PETIVA?' }]
    });
    console.log("Landing Chat Status:", landingRes.statusCode);
    console.log("Landing Chat Response Body:", landingRes.body);

    assert(landingRes.statusCode === 200, "Landing chat returns 200 OK");
    assert(landingRes.body.success === true, "Landing chat response indicates success");
    assert(typeof landingRes.body.message === 'string', "Landing chat returns text response");

    // 2. Authenticated Dashboard Chat (DeepSeek)
    console.log("\n[Test 2: Authenticated Dashboard Chat]");
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      email: "owner@example.com",
      password: "OwnerPass123!"
    });
    const token = getCookieValue(loginRes.headers['set-cookie'], 'session_token');
    const ownerCookie = { 'Cookie': `session_token=${token}` };
    assert(token !== null, "Logged in owner account");

    // Fetch pet Luna
    const petsRes = await makeRequest('GET', '/api/pets', null, ownerCookie);
    const lunaPet = petsRes.body.pets[0];

    // Trigger test payload to check structure sent to DeepSeek
    const chatConfigRes = await makeRequest('POST', '/api/ai/chat?test=true', {
      petId: lunaPet.id,
      message: "What is my pet's name?"
    }, ownerCookie);

    assert(chatConfigRes.statusCode === 200, "Dashboard chat validation test returns 200 OK");
    const systemPrompt = chatConfigRes.body.messagesToSend.find(m => m.role === 'system');
    assert(systemPrompt.content.includes("deepseek-v4-flash") || systemPrompt.content.includes("active pet context"), "Includes active context prompt instructions");

    // Real API Request to DeepSeek
    const chatRes = await makeRequest('POST', '/api/ai/chat', {
      petId: lunaPet.id,
      message: "What is my pet's name?"
    }, ownerCookie);

    console.log("DeepSeek Chat Status:", chatRes.statusCode);
    console.log("DeepSeek Chat Response Body:", chatRes.body);

    assert(chatRes.statusCode === 200, "DeepSeek dashboard completions query returns 200 OK");
    assert(chatRes.body.success === true, "Query indicates success");
    assert(typeof chatRes.body.message === 'string', "Returns AI content");

    console.log(`\nTests Completed. Passed: ${passed}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error("AI tests crashed:", err);
    process.exit(1);
  }
}

runTests();
