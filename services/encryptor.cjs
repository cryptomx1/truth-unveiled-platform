#!/usr/bin/env node
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const ROOT = "/home/mark/projects/truth-unveiled";
const DATA_DIR = path.join(ROOT, "data");       // plaintext source
const ENC_DIR  = path.join(ROOT, "data_enc");   // encrypted output

function listFilesRecursive(dirAbs) {
  const out = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else out.push(p);
    }
  }
  if (fs.existsSync(dirAbs)) walk(dirAbs);
  return out;
}

function deriveKey(passphrase, salt) {
  // scrypt -> 32-byte key for AES-256-GCM
  return crypto.scryptSync(passphrase, salt, 32);
}

function encryptBuffer(buf, passphrase) {
  const salt = crypto.randomBytes(16);
  const key  = deriveKey(passphrase, salt);
  const iv   = crypto.randomBytes(12); // GCM nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { salt, iv, tag, ciphertext };
}

function decryptBuffer(rec, passphrase) {
  const salt = Buffer.from(rec.salt, "base64");
  const iv   = Buffer.from(rec.iv, "base64");
  const tag  = Buffer.from(rec.tag, "base64");
  const key  = deriveKey(passphrase, salt);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(rec.ciphertext, "base64")),
    decipher.final()
  ]);
  return plaintext;
}

/**
 * POST /encrypt
 * body: { passphrase: string, removePlain?: boolean, scope?: "data" | "file", relpath?: string }
 *  - scope "data": encrypt all files in /data (default)
 *  - scope "file": encrypt a single file by relpath (e.g., "data/did.json")
 */
app.post("/encrypt", async (req, res) => {
  try {
    const { passphrase, removePlain = true, scope = "data", relpath } = req.body || {};
    if (!passphrase || typeof passphrase !== "string" || passphrase.length < 6) {
      return res.status(400).json({ ok: false, error: "Passphrase required (min 6 chars)" });
    }

    fs.mkdirSync(ENC_DIR, { recursive: true });

    let targets = [];
    if (scope === "file") {
      if (!relpath) return res.status(400).json({ ok: false, error: "relpath required for scope=file" });
      const abs = path.join(ROOT, relpath);
      if (!abs.startsWith(ROOT)) return res.status(400).json({ ok: false, error: "Invalid relpath" });
      if (!fs.existsSync(abs)) return res.status(404).json({ ok: false, error: "File not found" });
      targets = [abs];
    } else {
      targets = listFilesRecursive(DATA_DIR);
    }

    const results = [];
    for (const abs of targets) {
      const rel = path.relative(ROOT, abs);        // e.g., data/did.json
      const content = fs.readFileSync(abs);
      const enc = encryptBuffer(content, passphrase);
      const outRec = {
        alg: "AES-256-GCM",
        ts: new Date().toISOString(),
        src: rel,
        salt: enc.salt.toString("base64"),
        iv: enc.iv.toString("base64"),
        tag: enc.tag.toString("base64"),
        ciphertext: enc.ciphertext.toString("base64"),
      };

      const encAbs = path.join(ENC_DIR, rel + ".enc.json");
      fs.mkdirSync(path.dirname(encAbs), { recursive: true });
      fs.writeFileSync(encAbs, JSON.stringify(outRec, null, 2));

      if (removePlain) {
        try { fs.unlinkSync(abs); } catch {}
      }

      results.push({ src: rel, enc: path.relative(ROOT, encAbs), removed: removePlain });
    }

    return res.json({ ok: true, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /decrypt
 * body: { passphrase: string, relpath: string }  // e.g., "data_enc/did.json.enc.json"
 */
app.post("/decrypt", async (req, res) => {
  try {
    const { passphrase, relpath } = req.body || {};
    if (!passphrase || !relpath) {
      return res.status(400).json({ ok: false, error: "passphrase and relpath required" });
    }

    const abs = path.join(ROOT, relpath);
    if (!abs.startsWith(ROOT)) return res.status(400).json({ ok: false, error: "Invalid relpath" });
    if (!fs.existsSync(abs)) return res.status(404).json({ ok: false, error: "Encrypted file not found" });

    const rec = JSON.parse(fs.readFileSync(abs, "utf8"));
    const plaintext = decryptBuffer(rec, passphrase);
    const json = JSON.parse(plaintext.toString("utf8"));

    return res.json({ ok: true, src: rec.src, json });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = 7079;
app.listen(PORT, () => {
  console.log(`Encryptor service listening on http://127.0.0.1:${PORT}`);
});