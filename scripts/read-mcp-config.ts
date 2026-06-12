import fs from 'fs';
import path from 'path';
import os from 'os';

const home = os.homedir();

const paths = [
  path.join(home, '.gemini', 'antigravity-backup', 'mcp_config.json'),
  path.join(home, '.gemini', 'antigravity-ide', 'mcp_config.json'),
  path.join(home, '.gemini', 'config', 'mcp_config.json')
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log(`=== PATH: ${p} ===`);
    try {
      const content = fs.readFileSync(p, 'utf8');
      console.log(content);
    } catch (e: any) {
      console.error(`Error reading: ${e.message}`);
    }
  } else {
    console.log(`=== NOT FOUND: ${p} ===`);
  }
}
