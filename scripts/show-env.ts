import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('ENV keys in process.env:');
for (const key of Object.keys(process.env)) {
  if (key.includes('SUPABASE') || key.includes('TOKEN') || key.includes('PASS') || key.includes('KEY') || key.includes('SECRET')) {
    console.log(`${key}: ${process.env[key] ? 'DEFINED (length: ' + process.env[key]!.length + ')' : 'UNDEFINED'}`);
  }
}
