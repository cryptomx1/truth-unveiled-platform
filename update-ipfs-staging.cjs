#!/usr/bin/env node
const { execSync } = require("child_process");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const pinata = new (require("@pinata/sdk"))({ pinataApiKey: process.env.PINATA_API_KEY, pinataSecretApiKey: process.env.PINATA_API_SECRET });

const key = "sandbox-onboard";

(async () => {
  console.log("📦 Adding to IPFS...");
  const cid = execSync("ipfs add -r . --cid-version=1 --quieter").toString().trim();

  console.log("📡 Publishing to IPNS (staging) with key:", key);
  const out = execSync(`ipfs name publish --key=${key} /ipfs/${cid}`).toString();
  console.log(out);

  console.log("📌 Pinning CID to Pinata for global access...");
  try {
    await pinata.pinByHash(cid);
    console.log("✅ Pinned to Pinata");
  } catch (e) {
    console.log("⚠️ Pinata pin failed:", e.message);
  }

  fs.appendFileSync("./logs/ipfs_update_staging.log",
    `[${new Date().toISOString()}] CID: ${cid} | IPNS(key=${key})\n`);
  console.log("✅ Staging publish complete:", cid);
execSync("node tools/cid-peers.cjs ./logs/ipfs_update_staging.log");
})();