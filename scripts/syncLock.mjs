import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dir, '..');
const pkgPath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

export function syncLock() {
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // If package-lock.json doesn't exist, regenerate it
  if (!fs.existsSync(lockPath)) {
    console.log('[syncLock] package-lock.json not found, generating...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} i --package-lock-only`, { cwd: rootDir, stdio: 'inherit' });
    return;
  }

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  let modified = false;

  // 1. Sync name & version
  if (lock.name !== pkg.name) {
    lock.name = pkg.name;
    modified = true;
  }
  if (lock.version !== pkg.version) {
    lock.version = pkg.version;
    modified = true;
  }

  if (lock.packages && lock.packages['']) {
    if (lock.packages[''].name !== pkg.name) {
      lock.packages[''].name = pkg.name;
      modified = true;
    }
    if (lock.packages[''].version !== pkg.version) {
      lock.packages[''].version = pkg.version;
      modified = true;
    }
  }

  // 2. Check if dependencies or devDependencies in package.json differ from lockfile
  const pkgDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const lockRootDeps = lock.packages && lock.packages['']
    ? { ...(lock.packages[''].dependencies || {}), ...(lock.packages[''].devDependencies || {}) }
    : {};

  const depsChanged = Object.keys(pkgDeps).some(k => pkgDeps[k] !== lockRootDeps[k]) ||
                      Object.keys(lockRootDeps).some(k => pkgDeps[k] !== lockRootDeps[k]);

  if (depsChanged) {
    console.log('[syncLock] Dependency changes detected, updating package-lock.json...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execSync(`${npmCmd} i --package-lock-only`, { cwd: rootDir, stdio: 'inherit' });
    console.log('[syncLock] ✓ package-lock.json updated with new dependencies');
    return;
  }

  if (modified) {
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
    console.log(`[syncLock] ✓ package-lock.json synchronized to version ${pkg.version}`);
  }
}

syncLock();
