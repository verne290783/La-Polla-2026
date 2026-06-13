import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  try {
    console.log('Deploying calculate_points.sql DDL via Supabase CLI...');
    const ddlCmd = `npx cross-env SUPABASE_ACCESS_TOKEN=${token} npx supabase db query --linked --file calculate_points.sql`;
    execSync(ddlCmd, { stdio: 'inherit' });
    
    console.log('\nRunning match score recalculation via Supabase CLI...');
    const tempSqlPath = path.resolve(process.cwd(), 'temp_recalc.sql');
    fs.writeFileSync(tempSqlPath, 'SELECT public.compute_points(id) FROM public.matches;', 'utf8');
    
    const recalcCmd = `npx cross-env SUPABASE_ACCESS_TOKEN=${token} npx supabase db query --linked --file temp_recalc.sql`;
    execSync(recalcCmd, { stdio: 'inherit' });
    
    try {
      if (fs.existsSync(tempSqlPath)) {
        fs.unlinkSync(tempSqlPath);
      }
    } catch (e) {}
    console.log('Recalculation complete!');
  } catch (err: any) {
    console.error('Error during execution:', err.message);
    process.exit(1);
  }
}

run();
