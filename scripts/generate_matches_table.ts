import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  // Query all matches
  const { data: matches, error: mError } = await supabase
    .from('matches')
    .select('*')
    .order('id', { ascending: true });

  if (mError) {
    console.error('Error fetching matches:', mError);
    return;
  }

  // Query all teams
  const { data: teams, error: tError } = await supabase
    .from('teams')
    .select('*');

  if (tError) {
    console.error('Error fetching teams:', tError);
    return;
  }

  const teamMap = new Map(teams.map(t => [t.id, t]));

  let markdown = '# Reporte de Partidos en Base de Datos (Auditoría)\n\n';
  markdown += 'Esta tabla contiene los 104 partidos configurados en la base de datos de la aplicación.\n\n';
  markdown += '| ID | Fase | Local (ID) | Local (Nombre) | Visitante (ID) | Visitante (Nombre) | Fecha/Hora UTC | Hora Bogotá (America/Bogota) | Ciudad | Estadio | Estado |\n';
  markdown += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

  for (const m of matches) {
    const homeTeam = teamMap.get(m.home_team_id);
    const awayTeam = teamMap.get(m.away_team_id);

    const utcDate = new Date(m.match_date);
    const bogotaStr = utcDate.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    markdown += `| ${m.id} | ${m.phase} | ${m.home_team_id || 'TBD'} | ${homeTeam ? homeTeam.name : 'Por definir'} | ${m.away_team_id || 'TBD'} | ${awayTeam ? awayTeam.name : 'Por definir'} | ${m.match_date} | ${bogotaStr} | ${m.city || 'TBD'} | ${m.venue || 'TBD'} | ${m.status} |\n`;
  }

  const outputPath = 'C:\\Users\\Edison\\.gemini\\antigravity\\brain\\5c333528-4830-4b6a-b484-8353270947b8\\db_matches_audit.md';
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log('Saved matches audit table to:', outputPath);
}

run();
