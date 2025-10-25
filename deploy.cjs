const fs = require('fs');
const path = require('path');
const { PinataSDK } = require('pinata-web3');
const archiver = require('archiver');
require('dotenv').config();

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value === 'true' ? true : value === 'false' ? false : value;
      i++;
    } else {
      args[key] = true;
    }
  }
}

const { phase, verify, pin, log: logPath } = args;

if (!logPath) {
  console.error('❌ Log path required');
  process.exit(1);
}

const distPath = path.resolve('./');

if (!fs.existsSync(distPath)) {
  console.error('❌ Build folder not found.');
  process.exit(1);
}

console.log('🚀 Creating zip archive...');

const output = fs.createWriteStream('temp.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);
archive.glob('**/*', { cwd: distPath, ignore: ['node_modules/**', '.git/**', 'temp.zip'] });

output.on('close', async () => {
  console.log('📦 Zipping complete. Uploading to IPFS...');
const fileBuffer = fs.readFileSync('temp.zip');
const blob = new Blob([fileBuffer], { type: 'application/zip' });
  try {
    const result = await pinata.upload.file(blob);
    const cid = result.IpfsHash;
    console.log(`✅ Deployed Phase ${phase}: CID ${cid}`);

    const logEntry = {
      timestamp: new Date().toISOString(),
      phase,
      cid,
      verified: verify,
      pinned: pin,
      status: 'success',
    };

    fs.appendFileSync(path.resolve(logPath), JSON.stringify(logEntry) + '\n');
    console.log(`🌐 View on IPFS: https://gateway.pinata.cloud/ipfs/${cid}`);
    fs.unlinkSync('temp.zip');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  }
});

archive.on('error', (err) => {
  console.error('❌ Archiving failed:', err);
  process.exit(1);
});

archive.finalize();
