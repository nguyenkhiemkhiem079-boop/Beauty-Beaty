import http from 'http';
import fs from 'fs';
import path from 'path';

async function runTest() {
  console.log('=== RUNNING COMPREHENSIVE SERVER SECURITY & JOB LIFECYCLE TESTS ===');
  
  process.env.PORT = '3099';
  delete process.env.MEITU_API_KEY;
  delete process.env.AI_PROVIDER_KEY;

  // Import compiled server module
  const serverPath = path.join(__dirname, '../dist/index.js');
  const serverModule = require(serverPath);
  const { registerProcessor, unregisterProcessor, server } = serverModule;

  // Give server 500ms to start
  await new Promise(resolve => setTimeout(resolve, 500));

  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const existingFilesBeforeTest = new Set(fs.readdirSync(uploadsDir));
  console.log(`Pre-existing files in uploads dir: ${existingFilesBeforeTest.size}`);

  const boundary = '----WebKitFormBoundaryTest123456';
  const dummyFileContent = 'fake image binary data content for testing';
  
  const createMultipartBody = (tool = 'ai_enhance', content = dummyFileContent) => [
    `--${boundary}`,
    'Content-Disposition: form-data; name="tool"',
    '',
    tool,
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="test_avatar.jpg"',
    'Content-Type: image/jpeg',
    '',
    content,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const makePostRequest = (body: string, extraHeaders: Record<string, string> = {}) => new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
        ...extraHeaders
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  // TEST 1: Request without AI Provider (HTTP 503 BLOCKED)
  console.log('\n--- TEST 1: Request without AI Provider Key ---');
  const response1 = await makePostRequest(createMultipartBody());
  console.log(`Response 1 Status: ${response1.statusCode}, Body: ${response1.body}`);
  const parsed1 = JSON.parse(response1.body);
  if (response1.statusCode !== 503 || parsed1.status !== 'BLOCKED') {
    throw new Error(`Test 1 Failed: Expected 503 BLOCKED, got ${response1.statusCode}`);
  }
  let currentFiles = fs.readdirSync(uploadsDir);
  if (currentFiles.length > existingFilesBeforeTest.size) {
    throw new Error('Test 1 Failed: File was saved when provider key is missing!');
  }
  console.log('✅ TEST 1 PASSED: Endpoint returned 503 BLOCKED and 0 files were saved.');

  // TEST 2: Request with API Key but NO registered processor (HTTP 501 NOT_IMPLEMENTED)
  console.log('\n--- TEST 2: Key configured but NO Processor registered ---');
  process.env.MEITU_API_KEY = 'test_meitu_mock_key_123';
  unregisterProcessor('ai_enhance');

  const response2 = await makePostRequest(createMultipartBody('ai_enhance'));
  console.log(`Response 2 Status: ${response2.statusCode}, Body: ${response2.body}`);
  const parsed2 = JSON.parse(response2.body);
  if (response2.statusCode !== 501 || parsed2.status !== 'NOT_IMPLEMENTED') {
    throw new Error(`Test 2 Failed: Expected 501 NOT_IMPLEMENTED, got ${response2.statusCode}`);
  }
  currentFiles = fs.readdirSync(uploadsDir);
  if (currentFiles.length > existingFilesBeforeTest.size) {
    throw new Error('Test 2 Failed: File was saved when processor is not registered!');
  }
  console.log('✅ TEST 2 PASSED: Endpoint returned 501 NOT_IMPLEMENTED and 0 files were saved.');

  // TEST 3: Register real processor -> Job accepted (202) and completes processing (No infinite pending)
  console.log('\n--- TEST 3: Real Processor Registered -> Full Lifecycle (pending -> processing -> completed) ---');
  registerProcessor('ai_enhance', async (job: any, filePath: string) => {
    // Simulate real processor executing
    const resultFilename = `result_${path.basename(filePath)}`;
    const resultPath = path.join(uploadsDir, resultFilename);
    fs.writeFileSync(resultPath, 'enhanced image result binary');
    return { resultUrl: `/api/files/${resultFilename}` };
  });

  const response3 = await makePostRequest(createMultipartBody('ai_enhance'));
  console.log(`Response 3 Status: ${response3.statusCode}, Body: ${response3.body}`);
  const parsed3 = JSON.parse(response3.body);
  if (response3.statusCode !== 202 || !parsed3.jobId || !parsed3.ownershipToken) {
    throw new Error(`Test 3 Failed: Expected 202 with jobId and ownershipToken, got ${response3.statusCode}`);
  }
  console.log(`Job accepted with ID: ${parsed3.jobId}, ownershipToken: ${parsed3.ownershipToken}`);

  // Wait 100ms for asynchronous processor to complete
  await new Promise(resolve => setTimeout(resolve, 150));

  // TEST 4: Cross-Session Denial & Ownership Token Enforcement on GET /api/jobs/:id
  console.log('\n--- TEST 4: Cross-Session Denial & Ownership Token Enforcement ---');
  // 4A: Missing ownership token -> 403 FORBIDDEN
  const resNoToken = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:3099/api/jobs/${parsed3.jobId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
  console.log(`4A Missing Token Status: ${resNoToken.statusCode}, Body: ${resNoToken.body}`);
  if (resNoToken.statusCode !== 403) {
    throw new Error(`Test 4A Failed: Expected 403 FORBIDDEN when token missing, got ${resNoToken.statusCode}`);
  }

  // 4B: Wrong/tampered ownership token -> 403 FORBIDDEN (Cross-session attack denied)
  const resWrongToken = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port: 3099,
      path: `/api/jobs/${parsed3.jobId}`,
      headers: { 'x-ownership-token': 'attacker-fake-uuid-9999' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
  console.log(`4B Wrong Token Status: ${resWrongToken.statusCode}, Body: ${resWrongToken.body}`);
  if (resWrongToken.statusCode !== 403) {
    throw new Error(`Test 4B Failed: Expected 403 FORBIDDEN when token wrong, got ${resWrongToken.statusCode}`);
  }

  // 4C: Correct ownership token -> 200 OK & Job has completed!
  const resValidToken = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port: 3099,
      path: `/api/jobs/${parsed3.jobId}`,
      headers: { 'x-ownership-token': parsed3.ownershipToken }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
  console.log(`4C Valid Token Status: ${resValidToken.statusCode}, Body: ${resValidToken.body}`);
  const parsedValid = JSON.parse(resValidToken.body);
  if (resValidToken.statusCode !== 200 || parsedValid.status !== 'completed' || !parsedValid.resultUrl) {
    throw new Error(`Test 4C Failed: Expected 200 completed with resultUrl, got ${resValidToken.statusCode} - ${resValidToken.body}`);
  }
  console.log('✅ TEST 4 PASSED: Ownership token strictly enforced. Cross-session unauthorized access denied (403), job progressed to completed.');

  // TEST 5: Private Storage Access Authorization
  console.log('\n--- TEST 5: Private Storage Access Authorization ---');
  const resultFilename = path.basename(parsedValid.resultUrl);
  
  // 5A: Download without token -> 403 FORBIDDEN
  const resFileNoToken = await new Promise<{ statusCode?: number }>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:3099/api/files/${resultFilename}`, (res) => {
      resolve({ statusCode: res.statusCode });
    });
    req.on('error', reject);
  });
  if (resFileNoToken.statusCode !== 403) {
    throw new Error(`Test 5A Failed: Expected 403 for private file without token, got ${resFileNoToken.statusCode}`);
  }

  // 5B: Download with correct token -> 200 OK
  const resFileWithToken = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port: 3099,
      path: `/api/files/${resultFilename}`,
      headers: { 'x-ownership-token': parsed3.ownershipToken }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
  });
  if (resFileWithToken.statusCode !== 200 || resFileWithToken.body !== 'enhanced image result binary') {
    throw new Error(`Test 5B Failed: Expected 200 with result file content, got ${resFileWithToken.statusCode}`);
  }
  console.log('✅ TEST 5 PASSED: Private storage files cannot be accessed without valid ownership token.');

  // TEST 6: Real Upload Over 25MB Limit (HTTP 413)
  console.log('\n--- TEST 6: Real Upload Exceeding 25MB Limit (HTTP 413) ---');
  // Stream 26MB of dummy data via chunks
  const oversizedSize = 26 * 1024 * 1024; // 26 MB
  const headerPart = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="tool"',
    '',
    'ai_enhance',
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="giant_image.raw"',
    'Content-Type: application/octet-stream',
    '',
    ''
  ].join('\r\n');
  const footerPart = `\r\n--${boundary}--\r\n`;
  const totalLength = Buffer.byteLength(headerPart) + oversizedSize + Buffer.byteLength(footerPart);

  const resOverLimit = await new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      path: '/api/jobs',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(headerPart);

    // Send chunks of 1MB
    const chunk1MB = Buffer.alloc(1024 * 1024, 0x41);
    for (let sent = 0; sent < oversizedSize; sent += chunk1MB.length) {
      req.write(chunk1MB);
    }
    req.write(footerPart);
    req.end();
  });

  console.log(`Over-limit response Status: ${resOverLimit.statusCode}, Body: ${resOverLimit.body}`);
  if (resOverLimit.statusCode !== 413) {
    throw new Error(`Test 6 Failed: Expected 413 Payload Too Large, got ${resOverLimit.statusCode} - ${resOverLimit.body}`);
  }
  console.log('✅ TEST 6 PASSED: Real 26MB upload rejected by server with HTTP 413 Payload Too Large.');

  // CLEANUP: Specifically and ONLY delete files created during this test run
  console.log('\n--- CLEANUP: Preserving pre-existing uploads, removing only test-created files ---');
  const filesAfterTest = fs.readdirSync(uploadsDir);
  let cleanedCount = 0;
  for (const f of filesAfterTest) {
    if (!existingFilesBeforeTest.has(f)) {
      try {
        fs.unlinkSync(path.join(uploadsDir, f));
        cleanedCount++;
      } catch (e) {
        console.warn(`Could not delete test file ${f}:`, e);
      }
    }
  }
  console.log(`Successfully cleaned up ${cleanedCount} test-generated file(s). Pre-existing files left intact: ${existingFilesBeforeTest.size}`);
  console.log('\n=== ALL SERVER SECURITY, LIFECYCLE & CAPACITY TESTS PASSED SUCCESSFULLY! ===');
  
  if (server && server.close) {
    server.close();
  }
}

runTest().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
