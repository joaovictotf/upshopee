// Step 1: create auth users from profiles.csv preserving UUID + email, no password.
const https = require("https");
const fs = require("fs");
const path = require("path");
const KEY = fs.readFileSync(path.join(process.env.HOME || process.env.USERPROFILE, ".upshopee_sr_key"), "utf8").trim();
const DIR = "C:/Users/vinic/Downloads/ARQUIVOS LOVABLE";
const HOST = "ndawyrqzqhzbyjdmkdge.supabase.co";

function parseCSV(text) {
  const rows = []; let f = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c === "\r") { /* skip */ }
      else f += c;
    }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const raw = fs.readFileSync(path.join(DIR, "profiles.csv"), "utf8").replace(/^﻿/, "");
const rows = parseCSV(raw).filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
const header = rows[0];
const data = rows.slice(1);
const idx = n => header.indexOf(n);
const iId = idx("user_id"), iEmail = idx("email");
console.log("profiles rows to process:", data.length);

function createUser(id, email) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ id, email, email_confirm: true });
    const opts = {
      hostname: HOST, path: "/auth/v1/admin/users", method: "POST",
      headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve({ status: res.statusCode, body: d, id, email }));
    });
    req.on("error", e => resolve({ status: 0, body: e.message, id, email }));
    req.write(body); req.end();
  });
}

(async () => {
  let created = 0, skipped = 0, failed = 0; const errors = [];
  const CONC = 8;
  for (let i = 0; i < data.length; i += CONC) {
    const batch = data.slice(i, i + CONC);
    const res = await Promise.all(batch.map(r => createUser(r[iId], r[iEmail])));
    for (const x of res) {
      if (x.status === 200 || x.status === 201) created++;
      else if (x.status === 422 || /already.*registered|already.*exists|email_exists|user_already_exists/i.test(x.body)) skipped++;
      else { failed++; if (errors.length < 10) errors.push("[" + x.status + "] " + x.email + ": " + x.body.slice(0, 200)); }
    }
  }
  console.log("created:", created, "skipped(existing):", skipped, "failed:", failed);
  if (errors.length) { console.log("FIRST ERRORS:"); errors.forEach(e => console.log("  " + e)); }
  if (failed > 0) process.exit(1);
})();
