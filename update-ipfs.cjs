const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Updating IPFS deployment...');

try {
  // Add the directory to IPFS and get the root CID
  const addOutput = execSync('ipfs add -r . --cid-version=1 --quieter').toString().trim();
  const cid = addOutput;

  console.log(`📦 Added to IPFS: CID ${cid}`);

  // Publish to IPNS
  const publishOutput = execSync(`ipfs name publish /ipfs/${cid}`, { encoding: 'utf8' });
  console.log(`📡 Published to IPNS: ${publishOutput.trim()}`);

  (async () => {
    console.log("📡 Announcing CID to the DHT network...");
    execSync(`ipfs routing provide ${cid}`, { stdio: "inherit" });

    let verified = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`🔍 Verification attempt ${attempt}/3...`);
      try {
        const peers = execSync(`ipfs routing findprovs ${cid} | head -n 5`).toString();
        if (peers.includes("Qm")) {
          console.log("✅ CID successfully announced and visible on the DHT network.");
          verified = true;
          break;
        } else {
          console.log("⏳ No peers yet. Waiting 10s before next check...");
          await new Promise(r => setTimeout(r, 10000));
        }
      } catch (err) {
        console.log("⚠️ Error during DHT check, retrying in 10s...");
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    const ipns = publishOutput.trim().split(' ')[1];
    const status = verified ? "Verified" : "Announced (pending verification)";
    const publicUrl = `https://ipfs.io/ipns/${ipns}`;

    console.log(`🌐 Public Gateway: ${publicUrl}`);
    console.log(`📋 Status: ${status}`);

    const logPath = path.resolve('./logs/ipfs_update.log');
    fs.appendFileSync(
      logPath,
      `[${new Date().toISOString()}] CID: ${cid} | IPNS: ${ipns} | Status: ${status}\n`
    );

    console.log(`✅ Update complete. View at: ${publicUrl}`);
execSync("node tools/cid-peers.cjs");

    // --- Local Desktop Notification (Linux) ---
    try {
      const message = verified
        ? `✅ IPFS Update Verified!\nCID: ${cid}\nIPNS: ${ipns}`
        : `⚠️ IPFS Update Pending Verification.\nCID: ${cid}\nIPNS: ${ipns}`;
      execSync(`notify-send "IPFS Update" "${message}"`);
      console.log("🔔 Desktop notification sent successfully.");
    } catch {
      console.log("🔔 Notification skipped (notify-send not available).");
    }
  })();

} catch (error) {
  console.error('❌ Update failed:', error.message);
  process.exit(1);
}