// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================
// Truth Unveiled – DID Binder Service + Dashboard
// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================

import express from "express";
import cors from "cors";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 7078;
const DATA_DIR = path.join(process.env.HOME, "projects/truth-unveiled-platform", "data");
const REGISTRY = path.join(DATA_DIR, "did_registry.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load DID registry from file (or init empty)
let registry = {};
if (fs.existsSync(REGISTRY)) {
  try {
    registry = JSON.parse(fs.readFileSync(REGISTRY, "utf-8"));
  } catch {
    registry = {};
  }
}

// POST /did/init — create a new DID
app.post("/did/init", (req, res) => {
  const did = `did:truth:${crypto.randomBytes(8).toString("hex")}`;
  const fingerprint = crypto.createHash("sha256").update(did).digest("hex");
  registry[did] = { created: new Date().toISOString(), fingerprint };
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2));
  res.json({ ok: true, did, fingerprint });

// POST /locker/init — initialize locker for DID
app.post("/locker/init", (req, res) => {
  const { did, seed } = req.body;
  if (!did || !seed) {
    return res.status(400).json({ error: 'DID and seed required' });
  }
  if (!registry[did]) {
    return res.status(404).json({ error: 'DID not found' });
  }
  const snapshotPath = `/snapshots/${did.replace(/:/g, '-')}.enc`;
  res.json({ ok: true, snapshotPath });
});
});

// GET /did/list — list all registered DIDs
app.get("/did/list", (req, res) => {
  res.json(Object.keys(registry));
});

// GET /did/verify/:did — verify if a DID exists
app.get("/did/verify/:did", (req, res) => {
  const { did } = req.params;
  const exists = registry[did] !== undefined;
  res.json({ ok: exists, did });

});
});

// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================
// Default route — Sandbox Dashboard
// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Truth Unveiled — Sandbox Dashboard</title>
        <style>
          body { font-family: 'Inter', sans-serif; background: #0f1116; color: #eaeaea; text-align: center; padding: 40px; }
          h1 { color: #38bdf8; }
          .card { background: #1e2230; border-radius: 12px; padding: 20px; width: 600px; margin: 40px auto; text-align: left; }
          a { color: #38bdf8; text-decoration: none; }
          pre { background: #0d0f14; padding: 12px; border-radius: 8px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>🜂 Truth Unveiled Sandbox Dashboard</h1>
        <div class="card">
          <h3>API Endpoints</h3>
          <ul>
            <li><a href="/did/list">View all registered DIDs</a></li>
            <li><a href="/did/init">Create new DID (POST)</a></li>
          </ul>
          <hr />
          <p>Server running on <b>http://127.0.0.1:7078</b></p>
        </div>
      </body>
    </html>
  `);
});

// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================
// Start server
// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: 'Truth Unveiled Binder', status: 'online' });
});
// ============================================================

app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Truth Unveiled Binder + Dashboard running on http://127.0.0.1:${PORT}`);
});
