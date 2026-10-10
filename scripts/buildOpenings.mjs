/**
 * buildOpenings.mjs  —  Run once at build time (or deploy time)
 *
 * Reads  public/a.tsv … public/e.tsv  (and optionally public/frc.tsv)
 * Writes public/openings.json
 *
 * Usage:
 *   node scripts/buildOpenings.mjs
 *   # or add to package.json:
 *   #   "prebuild": "node scripts/buildOpenings.mjs"
 *
 * After this runs, openingsDatabase.js just does ONE fetch('/openings.json')
 * instead of replaying 4 500 games with chess.js on every page load.
 *
 * Requires: chess.js installed as a dev dependency
 *   npm i -D chess.js
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dir    = dirname(fileURLToPath(import.meta.url));
const PUBLIC   = join(__dir, '..', 'public');
const OUT_FILE = join(PUBLIC, 'openings.json');

// ─── TSV parser ──────────────────────────────────────────────────────────────

function parseTSV(text) {
  const lines   = text.trim().replace(/\r/g, '').split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split('\t');
  const idx     = (name) => headers.indexOf(name);
  const ecoI    = idx('eco');
  const nameI   = idx('name');
  const pgnI    = idx('pgn');
  const fenI    = idx('fen');   // already present in en-croissant TSVs!

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < headers.length) continue;
    const record = {
      eco:  cols[ecoI]?.trim()  ?? '',
      name: cols[nameI]?.trim() ?? '',
      pgn:  cols[pgnI]?.trim()  ?? '',
      fen:  cols[fenI]?.trim()  ?? '',
    };
    if (record.name) records.push(record);
  }
  return records;
}

// ─── PGN move extractor ───────────────────────────────────────────────────────

/** Strip move numbers / result tokens, return only SAN strings */
function extractSans(pgn) {
  return pgn
    .split(/\s+/)
    .filter(t => t && !/^\d+\.+$/.test(t) && !/^[*\-]/.test(t));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function build() {
  const byFen      = {};   // normalizedFen  → opening entry
  const byMoveKey  = {};   // "e2e4 e7e5 …"  → opening entry (chess.js SANs)

  let totalLoaded  = 0;
  let totalSkipped = 0;

  const TSV_DIR = join(__dir, '..', 'db', 'openings');

  // ── Standard ECO files ────────────────────────────────────────────────────
  for (const letter of ['a', 'b', 'c', 'd', 'e']) {
    const filePath = join(TSV_DIR, `${letter}.tsv`);
    if (!existsSync(filePath)) {
      console.warn(`  [skip] ${letter}.tsv not found`);
      continue;
    }

    const records = parseTSV(readFileSync(filePath, 'utf8'));
    console.log(`  ${letter}.tsv  →  ${records.length} records`);

    for (const record of records) {
      if (!record.pgn && !record.fen) { totalSkipped++; continue; }

      // ── Use TSV's pre-computed FEN if available (fast path) ───────────────
      // The en-croissant TSV already contains the final FEN — no need to
      // replay every move just to get it.  We still replay the moves to
      // produce chess.js-normalised SANs for the move-sequence index.
      let finalFen   = '';
      let chessSans  = [];
      let bookDepth  = 0;

      if (record.pgn) {
        const chess = new Chess();
        for (const san of extractSans(record.pgn)) {
          try {
            const result = chess.move(san);
            if (!result) break;
            chessSans.push(result.san);
            bookDepth++;
          } catch {
            break;
          }
        }
        finalFen = chess.fen();
      } else if (record.fen) {
        // FRC / positions without PGN — index by raw FEN only
        finalFen  = record.fen;
        bookDepth = 0;
      }

      if (!finalFen && !record.fen) { totalSkipped++; continue; }

      // Prefer chess.js-computed FEN (authoritative); fall back to TSV field
      const usedFen     = finalFen || record.fen;
      const normalised  = usedFen.split(' ').slice(0, 4).join(' ');

      const entry = {
        eco:       record.eco,
        name:      record.name,
        fen:       usedFen,
        bookDepth,
      };

      // FEN index (deepest entry wins — later TSV rows are more specific)
      byFen[normalised] = entry;

      // Move-sequence index
      if (chessSans.length > 0) {
        byMoveKey[chessSans.join(' ')] = entry;
      }

      totalLoaded++;
    }
  }

  // ── Fischer Random (optional) ─────────────────────────────────────────────
  const frcPath = join(TSV_DIR, 'frc.tsv');
  if (existsSync(frcPath)) {
    const frcRecords = parseTSV(readFileSync(frcPath, 'utf8'));
    console.log(`  frc.tsv  →  ${frcRecords.length} records`);

    for (const record of frcRecords) {
      if (!record.fen || !record.name) continue;
      const entry = { eco: 'FRC', name: record.name, fen: record.fen, bookDepth: 0 };
      byFen[record.fen] = entry;
      totalLoaded++;
    }
  }

  // ── Write output ──────────────────────────────────────────────────────────
  const output = { byFen, byMoveKey, version: '3.0-prebuilt', size: Object.keys(byFen).length };
  writeFileSync(OUT_FILE, JSON.stringify(output));   // no pretty-print = smaller file

  console.log(`\n✓ openings.json written`);
  console.log(`  Entries loaded : ${totalLoaded}`);
  console.log(`  Entries skipped: ${totalSkipped}`);
  console.log(`  FEN index size : ${Object.keys(byFen).length}`);
  console.log(`  Move index size: ${Object.keys(byMoveKey).length}`);
  console.log(`  File size      : ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
}

build();
