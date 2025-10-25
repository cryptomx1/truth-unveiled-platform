#!/usr/bin/env node
import express from "express";
import cors from "cors";
import { generateMnemonic } from "bip39";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/seed/new", async (req, res) => {
  // 128-bit entropy => 12 words
  const mnemonic = await generateMnemonic(128);
  res.json({ ok: true, mnemonic });
});

const PORT = 7080;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Seed service on http://127.0.0.1:${PORT}`);
});