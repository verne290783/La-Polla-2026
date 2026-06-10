import fs from 'fs';
import path from 'path';
import os from 'os';

const home = os.homedir();
const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');

const paths = [
  path.join(home, '.supabase'),
  path.join(home, '.config', 'supabase'),
  path.join(appData, 'supabase'),
  path.join(localAppData, 'supabase'),
];

console.log('Checking paths:');
for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`Exists: ${p}`);
    try {
      const files = fs.readdirSync(p);
      console.log(`Files in ${p}:`, files);
      for (const file of files) {
        const filePath = path.join(p, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          console.log(`File: ${file} (Size: ${stats.size})`);
          if (file.includes('token') || file.includes('config') || file.includes('credentials') || file.includes('json') || file.includes('toml')) {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`Content of ${file}:`, content.substring(0, 1000));
          }
        } else if (stats.isDirectory()) {
          console.log(`Directory: ${file}`);
          try {
            const subFiles = fs.readdirSync(filePath);
            console.log(`  Subfiles:`, subFiles);
          } catch (e) {}
        }
      }
    } catch (err: any) {
      console.log(`Error reading ${p}: ${err.message}`);
    }
  } else {
    console.log(`Not found: ${p}`);
  }
}
