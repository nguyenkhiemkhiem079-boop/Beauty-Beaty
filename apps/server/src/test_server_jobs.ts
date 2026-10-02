import http from 'http';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('=== RUNNING SERVER JOBS ENDPOINT TEST ===');
  
  // Set test port
  process.env.PORT = '3099';
  delete process.env.MEITU_API_KEY;
  delete process.env.AI_PROVIDER_KEY;
  delete process.env.ENABLE_AI_WORKER;

  // Dynamically import compiled server
  const serverPath = path.join(__dirname, '../dist/index.js');
  require(serverPath);

  // Give server 500ms to start
  await new Promise(resolve => setTimeout(resolve, 500));

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Snapshot existing files to ensure we ONLY clean up test-created files
  const existingFilesBeforeTest = new Set(fs.readdirSync(uploadsDir));
  console.log(`Pre-existing files in uploads dir: ${existingFilesBeforeTest.size}`);

  const boundary = '----WebKitFormBoundaryTest123456';
  const dummyFileContent = 'fake image binary data content for testing';
  
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="tool"',
    '',
    'ai_enhance',
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="test_avatar.jpg"',
    'Content-Type: image/jpeg',
    '',
    dummyFileContent,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const reqOptions: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: 3099,
    path: '/api/jobs',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const makePostRequest = () => new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  // TEST 1: Request without AI Provider (should return 503 BLOCKED and NOT save file)
  console.log('\n--- TEST 1: Request without AI Provider Key ---');
  const response1 = await makePostRequest();
  console.log(`Response 1 Status: ${response1.statusCode}`);
  console.log(`Response 1 Body: ${response1.body}`);

  const parsed1 = JSON.parse(response1.body);
  if (response1.statusCode !== 503 || parsed1.status !== 'BLOCKED') {
    throw new Error(`Test 1 Failed: Expected 503 BLOCKED, got ${response1.statusCode} - ${response1.body}`);
  }

  let currentFiles = fs.readdirSync(uploadsDir);
  if (currentFiles.length > existingFilesBeforeTest.size) {
    throw new Error('Test 1 Failed: Unwanted file was saved when provider key is missing!');
  }
  console.log('✅ TEST 1 PASSED: Endpoint returned 503 BLOCKED and 0 files were saved.');

  // TEST 2: Request with API Key but adapter NOT implemented (should return 501 NOT_IMPLEMENTED and NOT save file)
  console.log('\n--- TEST 2: Key configured but Worker Adapter not implemented ---');
  process.env.MEITU_API_KEY = 'test_meitu_mock_key_123';
  delete process.env.ENABLE_AI_WORKER;

  const response2 = await makePostRequest();
  console.log(`Response 2 Status: ${response2.statusCode}`);
  console.log(`Response 2 Body: ${response2.body}`);

  const parsed2 = JSON.parse(response2.body);
  if (response2.statusCode !== 501 || parsed2.status !== 'NOT_IMPLEMENTED') {
    throw new Error(`Test 2 Failed: Expected 501 NOT_IMPLEMENTED, got ${response2.statusCode} - ${response2.body}`);
  }

  currentFiles = fs.readdirSync(uploadsDir);
  if (currentFiles.length > existingFilesBeforeTest.size) {
    throw new Error('Test 2 Failed: Unwanted file was saved when adapter is not implemented!');
  }
  console.log('✅ TEST 2 PASSED: Endpoint returned 501 NOT_IMPLEMENTED and 0 files were saved.');

  // TEST 3: Request with AI Provider and Worker Adapter enabled
  console.log('\n--- TEST 3: Key configured AND Worker Adapter enabled ---');
  process.env.ENABLE_AI_WORKER = 'true';

  const response3 = await makePostRequest();
  console.log(`Response 3 Status: ${response3.statusCode}`);
  console.log(`Response 3 Body: ${response3.body}`);

  const parsed3 = JSON.parse(response3.body);
  if (response3.statusCode !== 202 || parsed3.status !== 'pending' || !parsed3.jobId) {
    throw new Error(`Test 3 Failed: Expected 202 pending with jobId, got ${response3.statusCode} - ${response3.body}`);
  }
  console.log('✅ TEST 3 PASSED: Job accepted as pending with valid jobId.');

  // TEST 4: GET /api/jobs/:id
  console.log('\n--- TEST 4: GET /api/jobs/:id ---');
  const response4 = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:3099/api/jobs/${parsed3.jobId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });

  console.log(`Response 4 Status: ${response4.statusCode}`);
  console.log(`Response 4 Body: ${response4.body}`);

  const parsed4 = JSON.parse(response4.body);
  if (response4.statusCode !== 200 || parsed4.id !== parsed3.jobId || parsed4.status !== 'pending') {
    throw new Error(`Test 4 Failed: Expected 200 with job details, got ${response4.statusCode} - ${response4.body}`);
  }
  console.log('✅ TEST 4 PASSED: Job retrieved successfully.');

  // TEST 5: GET /api/capabilities
  console.log('\n--- TEST 5: GET /api/capabilities ---');
  const response5 = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get('http://127.0.0.1:3099/api/capabilities', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });

  console.log(`Response 5 Status: ${response5.statusCode}`);
  console.log(`Response 5 Body: ${response5.body}`);

  const parsed5 = JSON.parse(response5.body);
  if (response5.statusCode !== 200 || typeof parsed5.maxUploadBytes !== 'number' || parsed5.maxUploadBytes !== 25 * 1024 * 1024) {
    throw new Error(`Test 5 Failed: Expected 200 with maxUploadBytes 25MB, got ${response5.statusCode} - ${response5.body}`);
  }
  console.log('✅ TEST 5 PASSED: Capabilities advertised correctly with bounded 25MB upload.');

  // CLEANUP: Specifically and ONLY delete files created during this test run
  console.log('\n--- CLEANUP: Preserving pre-existing uploads, removing only test-created files ---');
  const filesAfterTest = fs.readdirSync(uploadsDir);
  let cleanedCount = 0;
  for (const f of filesAfterTest) {
    if (!existingFilesBeforeTest.has(f)) {
      fs.unlinkSync(path.join(uploadsDir, f));
      cleanedCount++;
    }
  }
  console.log(`Successfully cleaned up ${cleanedCount} test-generated file(s). Pre-existing files left intact: ${existingFilesBeforeTest.size}`);

  console.log('\n=== ALL SERVER JOBS ENDPOINT TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Server test error:', err);
  process.exit(1);
});
