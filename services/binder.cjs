#!/usr/bin/env node
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());

const ROOT = "/home/mark/projects/truth-unveiled";
const DID_PATH = path.join(ROOT, "data", "did.json");
const UPDATE_CMD = `node ${path.join(ROOT, "update-ipfs.cjs")} --silent`;

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout || "OK");
    });
  });
}

app.post("/bind-did", async (req, res) => {  try {    const { did, encrypt = false, passphrase } = req.body || {};    if (!did || typeof did !== "string" || !did.startsWith("did:")) {      return res.status(400).json({ ok: false, error: "Invalid DID" });    }    // ensure /data exists    fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });    // write did.json atomically    const record = { did, bound_at: new Date().toISOString() };    fs.writeFileSync(DID_PATH, JSON.stringify(record, null, 2));    if (encrypt && passphrase) {      // Encrypt the file before publishing      const encRes = await fetch("http://127.0.0.1:7079/encrypt", {        method: "POST",        headers: { "Content-Type": "application/json" },        body: JSON.stringify({ passphrase, scope: "file", relpath: "data/did.json" })      });      const encJ = await encRes.json();      if (!encJ.ok) throw new Error("Encryption failed: " + encJ.error);    }    // publish to IPFS + IPNS    const out = await run(UPDATE_CMD);    return res.json({ ok: true, message: "DID bound" + (encrypt ? " + encrypted" : "") + " and published", output: out });  } catch (e) {    return res.status(500).json({ ok: false, error: e.message });  }});
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = 7078;
app.listen(PORT, () => {
  console.log(`DID binder service listening on http://127.0.0.1:${PORT}`);
});