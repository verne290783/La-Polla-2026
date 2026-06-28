import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAME_TO_ID: Record<string, string> = {
  'mexico': 'MEX',
  'south africa': 'RSA',
  'south korea': 'KOR',
  'czech republic': 'CZE',
  'chequia': 'CZE',
  'czechia': 'CZE',
  'canada': 'CAN',
  'switzerland': 'SUI',
  'qatar': 'QAT',
  'bosnia and herzegovina': 'BIH',
  'brazil': 'BRA',
  'morocco': 'MAR',
  'haiti': 'HAI',
  'scotland': 'SCO',
  'united states': 'USA',
  'usa': 'USA',
  'paraguay': 'PAR',
  'australia': 'AUS',
  'türkiye': 'TUR',
  'turkey': 'TUR',
  'germany': 'GER',
  'curacao': 'CUW',
  'curaçao': 'CUW',
  'ivory coast': 'CIV',
  'ecuador': 'ECU',
  'netherlands': 'NED',
  'japan': 'JPN',
  'sweden': 'SWE',
  'tunisia': 'TUN',
  'belgium': 'BEL',
  'egypt': 'EGY',
  'iran': 'IRN',
  'new zealand': 'NZL',
  'spain': 'ESP',
  'cape verde': 'CPV',
  'saudi arabia': 'KSA',
  'uruguay': 'URU',
  'france': 'FRA',
  'senegal': 'SEN',
  'norway': 'NOR',
  'iraq': 'IRQ',
  'argentina': 'ARG',
  'algeria': 'ALG',
  'austria': 'AUT',
  'jordan': 'JOR',
  'portugal': 'POR',
  'democratic republic of the congo': 'COD',
  'dr congo': 'COD',
  'congo dr': 'COD',
  'uzbekistan': 'UZB',
  'colombia': 'COL',
  'england': 'ENG',
  'croatia': 'CRO',
  'ghana': 'GHA',
  'panama': 'PAN'
};

const mapNameToId = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return NAME_TO_ID[key] || null;
};

const mapApiTlaToDbTla = (tla: string | null | undefined): string | null => {
  if (!tla) return null;
  if (tla === 'URY') return 'URU';
  return tla;
};

const parsePrimaryMatch = (pm: any) => {
  const apiStatus = pm.status;
  let status = 'scheduled';
  if (apiStatus === 'FINISHED') {
    status = 'finished';
  } else if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED' || apiStatus === 'LIVE') {
    status = 'live';
  }

  const isFinished = status === 'finished';
  const isLive = status === 'live';

  const homeScore = (isFinished || isLive) &&
                    pm.score?.fullTime?.home !== undefined &&
                    pm.score?.fullTime?.home !== null
                      ? Number(pm.score.fullTime.home)
                      : null;
  const awayScore = (isFinished || isLive) &&
                    pm.score?.fullTime?.away !== undefined &&
                    pm.score?.fullTime?.away !== null
                      ? Number(pm.score.fullTime.away)
                      : null;

  const hasRegularTime = (isFinished || isLive) &&
                         pm.score?.regularTime?.home !== undefined &&
                         pm.score?.regularTime?.home !== null;
  const homeScore90 = hasRegularTime
                      ? Number(pm.score.regularTime.home)
                      : homeScore;
  const awayScore90 = hasRegularTime
                      ? Number(pm.score.regularTime.away)
                      : awayScore;

  return { status, homeScore, awayScore, homeScore90, awayScore90 };
};

const parseBackupMatch = (bm: any) => {
  const isFinished = bm.finished === 'TRUE';
  const isLive = bm.time_elapsed && bm.time_elapsed !== 'notstarted' && bm.time_elapsed !== 'finished';
  const status = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';

  const homeScore = (status === 'finished' || status === 'live') && bm.home_score !== undefined && bm.home_score !== null ? parseInt(bm.home_score) : null;
  const awayScore = (status === 'finished' || status === 'live') && bm.away_score !== undefined && bm.away_score !== null ? parseInt(bm.away_score) : null;

  return { status, homeScore, awayScore, homeScore90: homeScore, awayScore90: awayScore };
};

async function run() {
  const { data: dbMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('id', 11)
    .single();

  const apiKey = process.env.FOOTBALL_API_KEY;
  let primaryMatches: any[] = [];
  if (apiKey) {
    const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey }
    });
    const data = await res.json();
    primaryMatches = data.matches || [];
  }

  const res2 = await fetch('https://worldcup26.ir/get/games');
  const data2 = await res2.json();
  const backupMatches = data2.games || [];

  const pm = primaryMatches.find((m: any) => m.id?.toString() === dbMatch?.external_match_id);
  console.log('Found pm:', !!pm);
  if (pm) {
    console.log('Parsed pm:', parsePrimaryMatch(pm));
  }

  const bm = backupMatches.find((m: any) => {
    if (m.type !== 'group') return false;
    const homeTla = mapNameToId(m.home_team_name_en);
    const awayTla = mapNameToId(m.away_team_name_en);
    return homeTla && awayTla && (
      (homeTla === dbMatch?.home_team_id && awayTla === dbMatch?.away_team_id) ||
      (homeTla === dbMatch?.away_team_id && awayTla === dbMatch?.home_team_id)
    );
  });
  console.log('Found bm:', !!bm);
  if (bm) {
    console.log('Parsed bm:', parseBackupMatch(bm));
  }
}

run();
