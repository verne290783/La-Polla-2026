import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function run() {
  try {
    const res = await fetch(supabaseUrl);
    console.log('Status:', res.status);
    console.log('Headers:');
    res.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
