import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ── Build-time file manifest generator ──────────────────────────────────────
// Generates a hash-based manifest of all cacheable public files.
// The service worker uses this to selectively update only changed files,
// similar to how "git status" tracks insertions/deletions/modifications.
function generateFileManifest() {
  return {
    name: 'generate-file-manifest',
    writeBundle() {
      const distDir = './dist';
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
      const manifest = { version: packageJson.version, files: {} };

      // Files/directories to include in the manifest for selective caching
      const trackedPaths = [
        'stockfish-v18/stockfish-nnue.js',
        'stockfish-v18/stockfish-nnue.wasm',
        'stockfish-v18/stockfish.js',
        'stockfish-v18/stockfish.wasm',
        'stockfish-v18/stockfish.asm.js',
        'berserk-v4.3.0/berserk.js',
        'berserk-v4.3.0/berserk.wasm',
        'berserk-v4.3.0/berserkWorker.js',
        // TSV databases
        'a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv', 'frc.tsv',
        'openings.json',
        'ECO.pgn',
        // Audio sound effects
        'sounds/move.mp3',
        'sounds/capture.mp3',
        'sounds/check.mp3',
        'sounds/castle.mp3',
      ];

      const manifestPath = path.join(distDir, 'file-manifest.json');
      
      // Function to recursively scan directories and add files
      const addDirToManifest = (dirPath) => {
        const fullDirPath = path.join(distDir, dirPath);
        if (fs.existsSync(fullDirPath)) {
          const items = fs.readdirSync(fullDirPath, { withFileTypes: true });
          for (const item of items) {
            const relPath = path.join(dirPath, item.name).replace(/\\/g, '/');
            if (item.isDirectory()) {
              addDirToManifest(relPath);
            } else if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.wasm') || item.name.endsWith('.css'))) {
              const fullFilePath = path.join(distDir, relPath);
              const data = fs.readFileSync(fullFilePath);
              const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 10);
              manifest.files['/' + relPath] = hash;
            }
          }
        }
      };

      // Add tracked engines and assets
      ['stockfish-v18', 'stockfish-v19', 'berserk-v4.3.0', 'assets'].forEach(addDirToManifest);

      for (const relPath of trackedPaths) {
        const fullPath = path.join(distDir, relPath);
        if (fs.existsSync(fullPath)) {
          const data = fs.readFileSync(fullPath);
          const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 10);
          manifest.files['/' + relPath] = hash;
        }
      }

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`[generate-file-manifest] Wrote ${Object.keys(manifest.files).length} file entries to file-manifest.json`);

      // Also write version.json (replaces old generate-version plugin)
      fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify({ version: manifest.version }));
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    generateFileManifest(),
    // ── Guard: fail the build if any file in src/ imports from functions/ ───
    {
      name: 'block-functions-imports',
      enforce: 'pre',
      resolveId(source, importer) {
        if (
          importer &&
          importer.includes(path.sep + 'src' + path.sep) &&
          (source.includes('/functions/') || source.includes('\\\\functions\\\\')) &&
          !source.includes('/functions/enginex/') && !source.includes('\\\\functions\\\\enginex\\\\')
        ) {
          throw new Error(
            `[Security] Blocked import of server-side module from client code!\n` +
            `  Importer: ${importer}\n` +
            `  Import:   ${source}\n` +
            `  Fix: Use the client-side copy in src/utils/ instead.`
          );
        }
        return null;
      }
    }
  ],
  build: {
    sourcemap: false, // Prevents browsers from reconstructing your original code
  },
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    // Proxy API requests to local Cloudflare Pages dev server during development
    // Start the Cloudflare dev server with: npx wrangler pages dev ./dist --port 8788
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
      }
    }
  },
  preview: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});