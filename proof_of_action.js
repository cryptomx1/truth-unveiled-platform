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
const enable_rewards = args.enable_rewards;
const sync_zebec_streams = args.sync_zebec_streams;
const verify_actions = args.verify_actions;
const signer = args.signer;
const logPath = args.log;

if (!logPath) {
  console.error('Log path required');
  process.exit(1);
}

// Simulate proof of action
const rewards_enabled = enable_rewards;
const zebec_streams_synced = sync_zebec_streams;
const actions_verified = verify_actions;
const kickback_rewards_v1 = rewards_enabled && zebec_streams_synced;

const logEntry = {
  timestamp: new Date().toISOString(),
  phase: phase,
  network: network,
  cid: cid,
  enable_rewards: rewards_enabled,
  sync_zebec_streams: zebec_streams_synced,
  verify_actions: actions_verified,
  signer: signer,
  kickback_rewards_v1: kickback_rewards_v1,
  status: 'success'
};

const logLine = JSON.stringify(logEntry) + '\n';

fs.appendFileSync(path.resolve(logPath), logLine);

console.log(`Proof of Action for ${phase} activated: Kickback Rewards v1 live.`);