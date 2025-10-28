// ============================================================
// Truth Unveiled – IPFS Publisher (encrypt + add + IPNS publish)
// ============================================================
import { create as createIPFS } from "ipfs-http-client";
import crypto from "crypto";

const IPFS_API  = process.env.IPFS_API  || "http://127.0.0.1:5001";
const IPNS_KEY  = process.env.IPNS_KEY  || "truth-binder";
const PINATA_JWT = process.env.PINATA_JWT || ""; // optional (remote pinning)

// ---------- helpers ----------
function ipfs() { return createIPFS({ url: IPFS_API }); }

// AES-256-GCM encrypt using key derived via scrypt from seed
export function encryptWithSeed(seed, payloadObj) {
  const salt = crypto.randomBytes(16);
  const iv   = crypto.randomBytes(12);

  const key = crypto.scryptSync(seed, salt, 32); // 32 bytes = AES-256
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = Buffer.from(JSON.stringify(payloadObj), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    salt: salt.toString("base64"),
    iv:   iv.toString("base64"),
    tag:  tag.toString("base64"),
    data: ciphertext.toString("base64")
  };
}

// AES-256-GCM decrypt with same seed
export function decryptWithSeed(seed, enc) {
  const salt = Buffer.from(enc.salt, "base64");
  const iv   = Buffer.from(enc.iv, "base64");
  const tag  = Buffer.from(enc.tag, "base64");
  const data = Buffer.from(enc.data, "base64");

  const key = crypto.scryptSync(seed, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8"));
}

// Add JSON to IPFS and return CID
export async function addJson(obj) {
  const client = ipfs();
  const { cid } = await client.add(JSON.stringify(obj));
  return cid.toString();
}

// Ensure IPNS key exists, return PeerID
export async function ensureIpnsKey(name = IPNS_KEY) {
  const client = ipfs();
  const keys = await client.key.list();
  const found = keys.find(k => k.name === name);
  if (found) return found.id;

  const created = await client.key.gen(name, { type: "ed25519" });
  return created.id;
}

// Publish CID to IPNS using given key
export async function publishIpns(cid, name = IPNS_KEY) {
  const client = ipfs();
  const res = await client.name.publish(`/ipfs/${cid}`, { key: name });
  return res.name;
}
