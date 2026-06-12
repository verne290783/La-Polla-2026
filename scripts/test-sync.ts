import dotenv from 'dotenv';
import path from 'path';

// Load env vars first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  console.log('Running syncRealScores manually with dynamic import...');
  try {
    const { syncRealScores } = await import('../src/lib/scoreSync');
    const result = await syncRealScores();
    console.log('Sync Result:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Sync failed with error:', err);
  }
}

run();
