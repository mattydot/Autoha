// Copies the game (plain static files, no bundler) into www/ for Capacitor.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
const out = 'www';
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
for (const p of ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'src', 'vendor', 'icons']) cpSync(p, `${out}/${p}`, { recursive: true });
console.log('web build ready in www/');
