// Step 2-9: import CSVs into public tables in dependency order.
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const DIR = "C:/Users/vinic/Downloads/ARQUIVOS LOVABLE";
const PW = process.env.SUPABASE_DB_PASSWORD;

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

function loadCSV(file) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8").replace(/^﻿/, "");
  const rows = parseCSV(raw).filter(r => !(r.length === 1 && r[0] === ""));
  const header = rows[0];
  const data = rows.slice(1);
  return { header, data };
}

// Tables in dependency-safe order. conflictCol = column(s) for ON CONFLICT.
const TABLES = [
  { file: "profiles.csv", table: "profiles", conflict: "user_id" },
  { file: "user_roles.csv", table: "user_roles", conflict: "id" },
  { file: "user_marketplace_connections.csv", table: "user_marketplace_connections", conflict: "id" },
  { file: "user_products.csv", table: "user_products", conflict: "id" },
  { file: "sales_orders.csv", table: "sales_orders", conflict: "id" },
  { file: "boost_campaigns.csv", table: "boost_campaigns", conflict: "id" },
  { file: "boost_simulated_events.csv", table: "boost_simulated_events", conflict: "id" },
  { file: "dashboard_lightning_events.csv", table: "dashboard_lightning_events", conflict: "id" },
  { file: "withdrawal_requests.csv", table: "withdrawal_requests", conflict: "id" },
  { file: "registration_tokens.csv", table: "registration_tokens", conflict: "id" },
];

const BATCH = 500;

async function importTable(c, spec, colTypes) {
  const { header, data } = loadCSV(spec.file);
  const cols = header;
  // Identify columns that are NOT plain text, so we coerce '' -> NULL for them
  // (text columns keep '' as a legitimate empty string).
  const nonText = new Set(cols.filter(col => {
    const t = colTypes[col];
    return t && t !== "text";
  }));

  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const slice = data.slice(i, i + BATCH);
    if (slice.length === 0) continue;
    const params = [];
    const tuples = slice.map(row => {
      const ph = cols.map((col, ci) => {
        let v = row[ci];
        if (v === undefined) v = null;
        if (v === "" && (nonText.has(col) || v === undefined)) v = null;
        params.push(v);
        return "$" + params.length;
      });
      return "(" + ph.join(",") + ")";
    });
    const sql = `INSERT INTO public.${spec.table} (${cols.map(x => '"' + x + '"').join(",")}) VALUES ${tuples.join(",")} ON CONFLICT (${spec.conflict}) DO NOTHING`;
    const res = await c.query(sql, params);
    inserted += res.rowCount;
  }
  return { csv: data.length, inserted };
}

(async () => {
  const c = new Client({ host: "aws-1-sa-east-1.pooler.supabase.com", port: 5432, user: "postgres.ndawyrqzqhzbyjdmkdge", password: PW, database: "postgres", ssl: { rejectUnauthorized: false } });
  await c.connect();
  const results = [];
  try {
    for (const spec of TABLES) {
      // fetch column types for '' -> NULL coercion
      const tcols = await c.query("select column_name, data_type from information_schema.columns where table_schema='public' and table_name=$1", [spec.table]);
      const colTypes = {};
      tcols.rows.forEach(r => colTypes[r.column_name] = r.data_type);
      try {
        const r = await importTable(c, spec, colTypes);
        results.push({ table: spec.table, ...r });
        console.log(`OK  ${spec.table}: csv=${r.csv} inserted=${r.inserted}`);
      } catch (e) {
        console.error(`FAIL ${spec.table}: ${e.message}`);
        console.error("STOPPING — no further tables imported.");
        process.exit(2);
      }
    }
    console.log("\nALL TABLES PROCESSED");
    console.log(JSON.stringify(results));
  } finally {
    await c.end();
  }
})();
