#!/usr/bin/env node
/**
 * Truth Unveiled – DID Binder Service (v1.1)
 * -------------------------------------------------
 * Provides endpoints for:
 *   /seed/new   →  12-word BIP-39 mnemonic
 *   /did/init   →  Generate & register a DID
 *   /pdl/open   →  Return Personal Data Locker JSON
 */

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

// ===== File paths =====
const ROOT = "/home/mark/projects/truth-unveiled-platform";
const DATA_DIR = path.join(ROOT, "data");
const DID_PATH = path.join(DATA_DIR, "did.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== Utilities =====
function randomWords(n = 12) {
  const wordlist = fs
    .readFileSync(
      path.join(ROOT, "node_modules", "bip39", "src", "wordlists", "english.json"),
      "utf8"
    )
    .split(/[\s,\n\r]+/)
    .filter(Boolean);
  return Array.from({ length: n }, () => wordlist[Math.floor(Math.random() * wordlist.length)]);
}

// ===== Endpoint 1: Generate Seed =====
app.get("/seed/new", (req, res) => {
  try {
    const words = randomWords(12);
    res.json({ ok: true, seed: words.join(" ") });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== Endpoint 2: Create DID =====
app.post("/did/init", (req, res) => {
  try {
    const { label } = req.body || {};
    if (!label) return res.status(400).json({ ok: false, error: "Missing label" });

    const did =
      "did:truth:" +
      crypto.randomBytes(8).toString("hex").replace(/(.{4})/g, "$1-").slice(0, -1);

    const record = {
      ok: true,
      label,
      did,
      created_at: new Date().toISOString(),
    };

    fs.writeFileSync(DID_PATH, JSON.stringify(record, null, 2));
    res.json(record);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== Endpoint 3: Open PDL =====
app.get("/pdl/open", (req, res) => {
  try {
    if (!fs.existsSync(DID_PATH))
      return res.status(404).json({ ok: false, error: "No locker found" });
    const locker = JSON.parse(fs.readFileSync(DID_PATH, "utf8"));
    res.json({ ok: true, locker });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ===== Start Server =====
const PORT = 7078;
app.listen(PORT, () =>
  console.log(`✅ DID Binder service listening on http://127.0.0.1:${PORT}`)
);
