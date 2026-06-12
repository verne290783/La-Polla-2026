import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, phase, home_team_id, away_team_id, match_date')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching matches:', error);
    process.exit(1);
  }

  if (!matches) {
    console.error('No matches found');
    process.exit(1);
  }

  console.log(`Fetched ${matches.length} matches.`);

  if (matches.length !== 104) {
    console.warn(`WARNING: Found ${matches.length} matches instead of 104!`);
  }

  const bogotaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  function formatIntlDate(formatter: Intl.DateTimeFormat, date: Date) {
    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
      partMap[part.type] = part.value;
    }
    return `${partMap.year}-${partMap.month}-${partMap.day} ${partMap.hour}:${partMap.minute}:${partMap.second}`;
  }

  let content = `# R1. Verified Match Schedule Table\n\n`;
  content += `| Match ID | Phase | Home Team ID | Away Team ID | UTC Date/Time | Bogotá Date/Time (America/Bogota) |\n`;
  content += `| --- | --- | --- | --- | --- | --- |\n`;

  for (const match of matches) {
    const date = new Date(match.match_date);
    const utcStr = formatIntlDate(utcFormatter, date);
    const bogotaStr = formatIntlDate(bogotaFormatter, date);
    content += `| ${match.id} | ${match.phase} | ${match.home_team_id || 'TBD'} | ${match.away_team_id || 'TBD'} | ${utcStr} | ${bogotaStr} |\n`;
  }

  const destPath = 'c:\\Users\\Edison\\Desktop\\LaPolla\\implementation_plan.md';
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`Successfully wrote ${matches.length} matches to ${destPath}`);
}

run();
