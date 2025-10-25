#!/usr/bin/env node
/**
 * cid-peers.cjs
 * Shows how many IPFS peers currently see your latest CID.
 * Usage: node tools/cid-peers.cjs
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const logFile = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, "../logs/ipfs_update.log");

function getLatestCID() {
  if (!fs.existsSync(logFile)) {
    console.error("❌ No log file found at", logFile);
    process.exit(1);
  }

  const lines = fs.readFileSync(logFile, "utf-8").trim().split("\n");
  const lastLine = JSON.parse(lines.pop());
  return lastLine.cid;
}

function countPeers(cid) {
  try {
    const output = execSync(`ipfs dht findprovs ${cid}`, {
      encoding: "utf8",
      timeout: 10000,
    });
    const peers = output.trim().split("\n").filter((l) => l.includes("Qm") || l.includes("12D3"));
    return peers.length;
  } catch (err) {
    console.error("⚠️ Unable to query peers:", err.message);
    return 0;
  }
}

function notify(title, msg) {
  try {
    execSync(`notify-send "${title}" "${msg}"`);
  } catch (_) {}
}

const cid = getLatestCID();
const peerCount = countPeers(cid);

console.log(`📡 CID ${cid}`);
console.log(`👥 Peers currently announcing: ${peerCount}`);

notify("IPFS Peer Check", `CID ${cid}\nPeers: ${peerCount}`);