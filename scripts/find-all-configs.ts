import fs from 'fs';
import path from 'path';
import os from 'os';

const home = os.homedir();
const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');

const searchDirs = [
  path.join(home, '.gemini'),
  path.join(appData, 'Gemini'),
  path.join(localAppData, 'Gemini'),
  path.join(appData, 'antigravity'),
  path.join(localAppData, 'antigravity'),
  home
];

function searchFile(dir: string, depth = 0) {
  if (depth > 4) return;
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stats;
      try {
        stats = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stats.isDirectory()) {
        // Skip large system dirs
        if (file === 'node_modules' || file === '.git' || file === 'AppData' || file === 'Local Settings' || file === 'Templates' || file === 'brain') {
          continue;
        }
        searchFile(fullPath, depth + 1);
      } else if (stats.isFile()) {
        const lower = file.toLowerCase();
        if (
          lower.includes('mcp') ||
          lower.includes('config') ||
          lower.includes('credentials') ||
          lower.includes('token')
        ) {
          console.log(`Found file: ${fullPath} (Size: ${stats.size})`);
          if (stats.size < 50000) {
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              if (content.includes('SUPABASE_') || content.includes('token') || content.includes('password') || content.includes('key')) {
                console.log(`Content snippet of ${file}:`);
                console.log(content.substring(0, 1000));
              }
            } catch (e: any) {
              console.log(`Error reading ${file}: ${e.message}`);
            }
          }
        }
      }
    }
  } catch (err: any) {
    // Ignore error
  }
}

async function run() {
  console.log('Searching for configs in:');
  for (const dir of searchDirs) {
    console.log(`- ${dir}`);
    searchFile(dir);
  }
  console.log('Search complete.');
}

run();
