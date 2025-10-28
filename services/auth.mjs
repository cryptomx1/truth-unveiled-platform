#!/usr/bin/env node
import express from "express";
import cors from "cors";
import fs from "fs";
import os from "os";
import path from "path";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const app = express();
app.use(cors());
app.use(express.json());

const SEC_DIR = path.join(os.homedir(), ".truth-unveiled", "secrets");
const TOTP_FILE = path.join(SEC_DIR, "totp.json");
fs.mkdirSync(SEC_DIR, { recursive: true });

app.post("/totp/init", async (req, res) => {
  const { label = "TruthUnveiled", issuer = "TruthUnveiled" } = req.body || {};
  const secret = speakeasy.generateSecret({ length: 20, name: `${issuer}:${label}` });
  fs.writeFileSync(TOTP_FILE, JSON.stringify({ ascii: secret.ascii, base32: secret.base32, created: Date.now() }, null, 2), { mode: 0o600 });
  const otpauth = secret.otpauth_url;
  const dataUrl = await qrcode.toDataURL(otpauth);
  res.json({ ok: true, base32: secret.base32, otpauth, qr: dataUrl });
});

app.post("/totp/verify", (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ ok: false, error: "token required" });
    const saved = JSON.parse(fs.readFileSync(TOTP_FILE, "utf8"));
    const verified = speakeasy.totp.verify({ secret: saved.base32, encoding: "base32", token, window: 1 });
    res.json({ ok: !!verified });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = 7081;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Auth service on http://127.0.0.1:${PORT}`);
});