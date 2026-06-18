import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN not found in .env.local');
    process.exit(1);
  }

  const sqlFile = 'auto_unlock_migration.sql';
  console.log(`Running migration ${sqlFile} using Supabase CLI...`);
  
  try {
    const cmd = `npx cross-env SUPABASE_ACCESS_TOKEN=${token} npx supabase db query --linked --file ${sqlFile}`;
    console.log(`Executing command: npx supabase db query --linked --file ${sqlFile}`);
    const output = execSync(cmd, { stdio: 'inherit' });
    console.log('Migration completed successfully!');
  } catch (err: any) {
    console.error('Error executing migration:', err.message);
    process.exit(1);
  }
}

run();
