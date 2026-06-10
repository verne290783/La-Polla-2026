import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Environment variable keys:', Object.keys(process.env));
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL is defined');
} else {
  console.log('DATABASE_URL is NOT defined');
}
