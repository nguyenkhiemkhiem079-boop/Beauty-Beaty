const https = require('https');
const fs = require('fs');
const path = require('path');

const fixturesDir = path.join(__dirname, '../apps/web/public/fixtures');
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const fixtures = [
  {
    name: 'real_portrait_front.jpg',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&q=85'
  },
  {
    name: 'real_portrait_tilted.jpg',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=85'
  },
  {
    name: 'real_portrait_beard.jpg',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=85'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading real portrait fixtures under Unsplash license...');
  for (const f of fixtures) {
    const dest = path.join(fixturesDir, f.name);
    console.log(`Downloading ${f.name}...`);
    await download(f.url, dest);
    const stat = fs.statSync(dest);
    console.log(`Saved ${f.name} (${Math.round(stat.size / 1024)} KB)`);
  }
  console.log('All fixtures downloaded successfully.');
}

main().catch(err => {
  console.error('Fixture download failed:', err);
  process.exit(1);
});
