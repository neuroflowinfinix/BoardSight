import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const pkgDir = path.join(__dirname, '..', 'node_modules', 'stockfish');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

function findFile(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const found = findFile(fullPath, filename);
      if (found) return found;
    } else if (file === filename) {
      return fullPath;
    }
  }
  return null;
}

// Explicitly copy the 'asm' version which is pure JavaScript fallback.
// This completely avoids WebAssembly compilation, which causes 'Uncaught RuntimeError'
// on old devices (like Realme C2) that lack WebAssembly SIMD or have broken WASM compilers.
const jsFile = path.join(pkgDir, 'bin', 'stockfish-18-asm.js');

const destJs   = path.join(publicDir, 'stockfish.js');
const destWasm = path.join(publicDir, 'stockfish.wasm');

// Always overwrite to ensure we get the right version
if (fs.existsSync(jsFile)) {
  fs.copyFileSync(jsFile, destJs);
  console.log('✅ Stockfish ASM copied to public/stockfish.js');
  
  // Remove the old WASM file so the browser doesn't try to fetch it
  if (fs.existsSync(destWasm)) {
    fs.unlinkSync(destWasm);
    console.log('🗑️  Removed old stockfish.wasm');
  }
} else {
  console.error('❌ Could not find Stockfish ASM file in node_modules.');
  process.exit(1);
}