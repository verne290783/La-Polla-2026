import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const { createClient } = await import('@supabase/supabase-js');
  const fs = await import('fs');
  const path = await import('path');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Querying all matches from database...');
  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('id, phase, home_team_id, away_team_id, match_date')
    .order('id', { ascending: true });

  if (mError) {
    console.error('Error querying matches:', mError);
    return;
  }

  let markdown = '# FIFA World Cup 2026 Matches Schedule\n\n';
  markdown += '| ID | Fase | Local | Visitante | Fecha (UTC) | Hora Bogotá (UTC-5) |\n';
  markdown += '|----|------|-------|-----------|-------------|---------------------|\n';

  for (const m of (matches || [])) {
    const d = new Date(m.match_date);
    const bogotaStr = d.toLocaleString('es-CO', { 
      timeZone: 'America/Bogota', 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    markdown += `| ${m.id} | ${m.phase} | ${m.home_team_id || 'TBD'} | ${m.away_team_id || 'TBD'} | ${m.match_date} | ${bogotaStr} |\n`;
  }

  const outputPath = 'C:\\Users\\Edison\\.gemini\\antigravity\\brain\\68ca26d3-3995-40f6-bf18-2b190d63fa1a\\matches_table.md';
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log('Saved matches table to:', outputPath);
}
run();
