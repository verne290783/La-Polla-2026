import fs from 'fs';
import path from 'path';
import os from 'os';

const home = os.homedir();
const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');

const pgpassPath = path.join(appData, 'postgresql', 'pgpass.conf');
const pgpassHomePath = path.join(home, 'pgpass.conf');
const pgpassDotHomePath = path.join(home, '.pgpass');

console.log('Checking pgpass paths:');
[pgpassPath, pgpassHomePath, pgpassDotHomePath].forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`Found: ${p}`);
    try {
      const content = fs.readFileSync(p, 'utf8');
      console.log(`Content of ${p}:`, content);
    } catch (e: any) {
      console.log(`Error reading ${p}: ${e.message}`);
    }
  } else {
    console.log(`Not found: ${p}`);
  }
});
