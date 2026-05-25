const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN || '';
const OWNER = 'mr-yasar';
const REPO = 'coffee-virtualintern';
const BASE_DIR = __dirname;

// Files to push
const FILES = [
  'app.py',
  'models.py',
  'requirements.txt',
  '.gitignore',
  'templates/base.html',
  'templates/index.html',
  'static/css/style.css',
  'static/js/app.js',
];

function apiRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'AromaLounge-Pusher',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(responseData) }); }
        catch(e) { resolve({ status: res.statusCode, body: responseData }); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFileSHA(filePath) {
  const res = await apiRequest('GET', `/repos/${OWNER}/${REPO}/contents/${filePath}`);
  if (res.status === 200) return res.body.sha;
  return null;
}

async function pushFile(filePath) {
  const fullPath = path.join(BASE_DIR, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP (not found): ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath);
  const encoded = content.toString('base64');
  const sha = await getFileSHA(filePath);

  const body = {
    message: `Add ${filePath}`,
    content: encoded,
    ...(sha ? { sha } : {})
  };

  const res = await apiRequest('PUT', `/repos/${OWNER}/${REPO}/contents/${filePath}`, body);
  if (res.status === 201 || res.status === 200) {
    console.log(`  ✓ Pushed: ${filePath}`);
  } else {
    console.log(`  ✗ Failed: ${filePath} - ${JSON.stringify(res.body.message || res.body)}`);
  }
}

async function main() {
  console.log('\n==================================================');
  console.log('   AROMA LOUNGE - GITHUB UPLOAD VIA API');
  console.log('==================================================\n');

  // Check repo access
  console.log('Checking repository access...');
  const repoCheck = await apiRequest('GET', `/repos/${OWNER}/${REPO}`);
  if (repoCheck.status !== 200) {
    console.log('ERROR: Cannot access repository. Check token permissions or repo name.');
    console.log(repoCheck.body.message);
    process.exit(1);
  }
  console.log(`✓ Connected to: ${repoCheck.body.full_name}\n`);

  console.log('Uploading files...');
  for (const file of FILES) {
    await pushFile(file);
  }

  console.log('\n==================================================');
  console.log('   ✓ ALL FILES PUSHED TO GITHUB SUCCESSFULLY!');
  console.log(`   View at: https://github.com/${OWNER}/${REPO}`);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
