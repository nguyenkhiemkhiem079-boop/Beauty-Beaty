import http from 'http';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('=== RUNNING SERVER JOBS ENDPOINT TEST ===');
  
  // Set test port
  process.env.PORT = '3099';
  delete process.env.MEITU_API_KEY;
  delete process.env.AI_PROVIDER_KEY;

  // Dynamically import compiled server
  const serverPath = path.join(__dirname, '../dist/index.js');
  require(serverPath);

  // Give server 500ms to start
  await new Promise(resolve => setTimeout(resolve, 500));

  const uploadsDir = path.join(__dirname, '../uploads');
  const initialFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
  console.log(`Initial files in uploads dir: ${initialFiles.length}`);

  // Test 1: POST without AI Provider (should return 503 BLOCKED and NOT save file)
  console.log('\n--- TEST 1: Request without AI Provider ---');
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

  const response1 = await new Promise<{ statusCode?: number, body: string }>((resolve, reject) => {
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log(`Response 1 Status: ${response1.statusCode}`);
  console.log(`Response 1 Body: ${response1.body}`);

  const parsed1 = JSON.parse(response1.body);
  if (response1.statusCode !== 503 || parsed1.status !== 'BLOCKED') {
    throw new Error(`Test 1 Failed: Expected 503 BLOCKED, got ${response1.statusCode} - ${response1.body}`);
  }

  // Verify uploads directory did NOT store unwanted file
  const currentFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
  console.log(`Files in uploads dir after blocked upload: ${currentFiles.length}`);
  if (currentFiles.length > initialFiles.length) {
    throw new Error(`Test 1 Failed: Unwanted file was saved to uploads directory! Found: ${currentFiles.join(', ')}`);
  }
  console.log('✅ TEST 1 PASSED: Endpoint returned 503 BLOCKED and zero files were saved.');

  // Test 2: With Provider configured (should accept upload and create pending job)
  console.log('\n--- TEST 2: Request with AI Provider configured ---');
  process.env.MEITU_API_KEY = 'test_meitu_mock_key_123';

  const response2 = await new Promise<{ statusCode?: number, body: string }>((resolve, reject) => {
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log(`Response 2 Status: ${response2.statusCode}`);
  console.log(`Response 2 Body: ${response2.body}`);

  const parsed2 = JSON.parse(response2.body);
  if (response2.statusCode !== 202 || parsed2.status !== 'pending' || !parsed2.jobId) {
    throw new Error(`Test 2 Failed: Expected 202 pending with jobId, got ${response2.statusCode} - ${response2.body}`);
  }

  // Test 3: GET /api/jobs/:id
  console.log('\n--- TEST 3: GET /api/jobs/:id ---');
  const response3 = await new Promise<{ statusCode?: number, body: string }>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:3099/api/jobs/${parsed2.jobId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });

  console.log(`Response 3 Status: ${response3.statusCode}`);
  console.log(`Response 3 Body: ${response3.body}`);

  const parsed3 = JSON.parse(response3.body);
  if (response3.statusCode !== 200 || parsed3.id !== parsed2.jobId || parsed3.status !== 'pending') {
    throw new Error(`Test 3 Failed: Expected 200 with job details, got ${response3.statusCode} - ${response3.body}`);
  }
  console.log('✅ TEST 3 PASSED: Job retrieved successfully.');

  // Clean up any files created during test 2
  const filesToClean = fs.readdirSync(uploadsDir);
  for (const f of filesToClean) {
    fs.unlinkSync(path.join(uploadsDir, f));
  }
  console.log('Cleaned up test uploads.');

  console.log('\n=== ALL SERVER JOBS ENDPOINT TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Server test error:', err);
  process.exit(1);
});
