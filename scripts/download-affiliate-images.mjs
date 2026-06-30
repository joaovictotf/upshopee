/**
 * Batch affiliate product image downloader.
 *
 * Usage: node scripts/download-affiliate-images.mjs
 *    or: npm run affiliate:images
 *
 * Reads docs/research/shopee-product-links-input.csv
 * Downloads every source_image_url → public/affiliate-products/prod-N/main.webp
 * Skips products that already have a valid main.webp.
 * Uses .part temp files, retries up to 2 times, 20s timeout, max 5 concurrent.
 *
 * Updates image_status and local_image_path in the CSV after each download.
 * Creates a CSV backup before writing.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, renameSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(ROOT, "docs", "research", "shopee-product-links-input.csv");
const IMG_DIR = join(ROOT, "public", "affiliate-products");
const REPORT_PATH = join(ROOT, "docs", "research", "affiliate-image-download-report.md");
const CONCURRENCY = 5;
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const TARGET_SIZE = 800;
const WEBP_QUALITY = 82;

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split("\n");
  for (const line of lines) {
    const cols = [];
    let col = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { cols.push(col); col = ""; continue; }
      col += ch;
    }
    cols.push(col);
    rows.push(cols);
  }
  return rows;
}

function rowsToCSV(rows) {
  const lines = [];
  for (const row of rows) {
    const escaped = row.map(cell => {
      const s = String(cell ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    lines.push(escaped.join(","));
  }
  return lines.join("\n") + "\n";
}

// ── Report builder ─────────────────────────────────────────────────────────────
const reportLines = [];
function report(line) {
  console.log(line);
  reportLines.push(line);
}

// ── Single image download ──────────────────────────────────────────────────────
async function downloadImage(url, outPath, retries = MAX_RETRIES) {
  const partPath = outPath + ".part";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (res.status !== 200) {
        if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
        return { ok: false, reason: `HTTP ${res.status}` };
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.startsWith("image/")) {
        if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
        return { ok: false, reason: `Non-image Content-Type: ${ct}` };
      }

      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) {
        if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
        return { ok: false, reason: "Empty body" };
      }

      if (buf.length > MAX_SIZE_BYTES) {
        return { ok: false, reason: `Too large: ${(buf.length / 1024 / 1024).toFixed(1)} MB` };
      }

      // Write .part
      writeFileSync(partPath, buf);
      return { ok: true, partPath };

    } catch (err) {
      if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
      const msg = err.name === "AbortError" ? "Timeout" : (err.message || String(err));
      return { ok: false, reason: msg };
    }
  }
  return { ok: false, reason: "Max retries exhausted" };
}

// ── Convert to webp ────────────────────────────────────────────────────────────
async function convertToWebp(partPath, outPath) {
  try {
    const metadata = await sharp(partPath).metadata();
    const img = sharp(partPath);

    // Resize to fit inside TARGET_SIZE x TARGET_SIZE, preserving aspect ratio
    const needsResize = metadata.width > TARGET_SIZE || metadata.height > TARGET_SIZE;
    const pipeline = needsResize
      ? img.resize(TARGET_SIZE, TARGET_SIZE, { fit: "inside", background: { r: 255, g: 255, b: 255 } })
      : img;

    await pipeline
      .webp({ quality: WEBP_QUALITY })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .toFile(outPath);

    return { ok: true };
  } catch (err) {
    try { unlinkSync(partPath); } catch {}
    return { ok: false, reason: `Sharp error: ${err.message || err}` };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function csvCol(rows, rowIdx, colIdx) {
  return (rows[rowIdx] && rows[rowIdx][colIdx]) ? rows[rowIdx][colIdx].trim() : "";
}

function setCsvCol(rows, rowIdx, colIdx, value) {
  if (!rows[rowIdx]) return;
  rows[rowIdx][colIdx] = value;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  report("# Affiliate Image Download Report");
  report(`\n**Started:** ${new Date().toISOString()}\n`);

  // Parse CSV
  let csvText;
  try {
    csvText = readFileSync(CSV_PATH, "utf8");
  } catch {
    report("**FATAL:** CSV not found at " + CSV_PATH);
    process.exit(1);
  }
  const rows = parseCSV(csvText);
  const header = rows[0];
  const dataRows = rows.slice(1);

  report(`| Metric | Count |`);
  report(`|---|---|`);
  report(`| Total CSV data rows | ${dataRows.length} |`);

  // Build task list
  const tasks = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const prodNum = csvCol(dataRows, i, 0);
    const sourceUrl = csvCol(dataRows, i, 5); // source_image_url
    const localPath = csvCol(dataRows, i, 6); // local_image_path
    const prodDir = join(IMG_DIR, `prod-${prodNum}`);
    const finalPath = join(prodDir, "main.webp");

    if (!sourceUrl || sourceUrl === "BROKEN") {
      tasks.push({ rowIdx: i, prodNum, sourceUrl, finalPath, status: "no_url" });
      continue;
    }

    // Check if already downloaded
    if (existsSync(finalPath)) {
      try {
        await sharp(finalPath).metadata();
        // Already valid
        setCsvCol(dataRows, i, 6, `affiliate-products/prod-${prodNum}/main.webp`);
        setCsvCol(dataRows, i, 11, "LOCAL_IMAGE_READY");
        tasks.push({ rowIdx: i, prodNum, sourceUrl, finalPath, status: "already_exists" });
        continue;
      } catch {
        // Corrupt — re-download
        unlinkSync(finalPath);
      }
    }

    tasks.push({ rowIdx: i, prodNum, sourceUrl, finalPath, status: "pending" });
  }

  const pending = tasks.filter(t => t.status === "pending");
  const already = tasks.filter(t => t.status === "already_exists");
  const noUrl = tasks.filter(t => t.status === "no_url");

  report(`| Image URLs found | ${tasks.filter(t => t.status !== "no_url").length} |`);
  report(`| Already downloaded | ${already.length} |`);
  report(`| Pending download | ${pending.length} |`);
  report(`| Missing source URL | ${noUrl.length} |`);
  report("");

  if (already.length > 0) {
    report("## Already downloaded (skipped)\n");
    for (const t of already) {
      report(`- **prod-${t.prodNum}** — ${t.finalPath}`);
    }
    report("");
  }

  if (pending.length === 0) {
    report("## No images to download\n");
    report("All available images are already present or no source URLs exist.\n");
    writeReport();
    saveCSV(dataRows);
    return;
  }

  // Download with concurrency limit
  report("## Download results\n");

  let downloaded = 0;
  let failed = 0;
  const failures = [];

  // Process in batches of CONCURRENCY
  for (let batchStart = 0; batchStart < pending.length; batchStart += CONCURRENCY) {
    const batch = pending.slice(batchStart, batchStart + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (t) => {
        report(`  Downloading prod-${t.prodNum} from ${t.sourceUrl}`);

        // Ensure dir exists
        const prodDir = dirname(t.finalPath);
        mkdirSync(prodDir, { recursive: true });

        const dl = await downloadImage(t.sourceUrl, t.finalPath);
        if (!dl.ok) {
          return { ...t, result: "download_failed", reason: dl.reason };
        }

        const cv = await convertToWebp(dl.partPath, t.finalPath);
        // Clean up .part
        try { unlinkSync(dl.partPath); } catch {}

        if (!cv.ok) {
          return { ...t, result: "convert_failed", reason: cv.reason };
        }

        return { ...t, result: "success" };
      })
    );

    for (const r of results) {
      if (r.result === "success") {
        downloaded++;
        const relPath = `affiliate-products/prod-${r.prodNum}/main.webp`;
        setCsvCol(dataRows, r.rowIdx, 6, relPath);
        setCsvCol(dataRows, r.rowIdx, 11, "LOCAL_IMAGE_READY");
        report(`    ✅ prod-${r.prodNum} → ${relPath}`);
      } else {
        failed++;
        const reason = r.reason || "unknown";
        setCsvCol(dataRows, r.rowIdx, 11, "DOWNLOAD_FAILED");
        // Append failure detail to notes if not already there
        const existingNotes = csvCol(dataRows, r.rowIdx, 12);
        const failNote = `Image download failed: ${reason}.`;
        const newNotes = existingNotes ? `${existingNotes} ${failNote}` : failNote;
        setCsvCol(dataRows, r.rowIdx, 12, newNotes);
        failures.push({ prodNum: r.prodNum, reason });
        report(`    ❌ prod-${r.prodNum} — ${reason}`);
      }
    }
  }

  report("");
  report(`| Result | Count |`);
  report(`|---|---|`);
  report(`| Downloaded + converted | ${downloaded} |`);
  report(`| Failed | ${failed} |`);
  report(`| Already existed (skipped) | ${already.length} |`);
  report(`| No source URL | ${noUrl.length} |`);
  report("");

  if (failures.length > 0) {
    report("## Failures\n");
    report("| Product | Reason |");
    report("|---|---|");
    for (const f of failures) {
      report(`| prod-${f.prodNum} | ${f.reason} |`);
    }
    report("");
  }

  report("## Final local paths\n");
  for (const t of tasks) {
    if (t.status === "already_exists" || tasks.find(x => x.rowIdx === t.rowIdx && tasks.indexOf(x) !== tasks.indexOf(t))) continue;
    const local = csvCol(dataRows, t.rowIdx, 6);
    const imgStatus = csvCol(dataRows, t.rowIdx, 11);
    report(`| prod-${t.prodNum} | ${local || "(none)"} | ${imgStatus} |`);
  }
  report("");

  writeReport();
  saveCSV(dataRows);
  report("**Done.** Run `npm run affiliate:images` to re-run.");
}

function writeReport() {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, reportLines.join("\n") + "\n", "utf8");
  console.log(`\nReport written to: ${REPORT_PATH}`);
}

function saveCSV(dataRows) {
  // Backup first
  const bak = CSV_PATH + ".bak";
  copyFileSync(CSV_PATH, bak);
  console.log(`CSV backup: ${bak}`);

  // Rebuild: header row from original + updated data
  const header = parseCSV(readFileSync(CSV_PATH, "utf8"))[0];
  const outRows = [header, ...dataRows];
  writeFileSync(CSV_PATH, rowsToCSV(outRows), "utf8");
  console.log(`CSV updated: ${CSV_PATH}`);
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
