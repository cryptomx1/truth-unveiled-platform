const fs = require('fs');
const path = require('path');

// Simple arg parser
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value === 'true' ? true : value === 'false' ? false : value;
      i++; // skip next
    } else {
      args[key] = true; // flag
    }
  }
}

const phase = args.phase;
const network = args.network;
const cid = args.cid;
const enable_discovery = args.enable_discovery;
const register_beacon = args.register_beacon;
const signer = args.signer;
const logPath = args.log;

if (!logPath) {
  console.error('Log path required');
  process.exit(1);
}

// Simulate lighthouse init
const discovery_enabled = enable_discovery;
const beacon_registered = register_beacon;
const lighthouse_active = discovery_enabled && beacon_registered;

const logEntry = {
  timestamp: new Date().toISOString(),
  phase: phase,
  network: network,
  cid: cid,
  enable_discovery: discovery_enabled,
  register_beacon: beacon_registered,
  signer: signer,
  lighthouse_active: lighthouse_active,
  status: 'success'
};

const logLine = JSON.stringify(logEntry) + '\n';

fs.appendFileSync(path.resolve(logPath), logLine);

console.log(`Lighthouse Protocol for ${phase} initialized: Beacon broadcasting to the cosmos.`);