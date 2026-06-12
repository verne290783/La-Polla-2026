import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });
    const schema: any = await res.json();
    console.log('Paths in API schema:');
    const paths = Object.keys(schema.paths || {});
    const rpcPaths = paths.filter(p => p.startsWith('/rpc/'));
    console.log(rpcPaths);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
