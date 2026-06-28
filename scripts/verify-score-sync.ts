// Set environment variables before importing scoreSync
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.FOOTBALL_API_KEY = 'mock-api-key';

// Setup Mock Data
const mockDbMatches = [
  // 1. Swapped group stage match
  {
    id: 1,
    phase: 'group',
    home_team_id: 'MEX',
    away_team_id: 'RSA',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: null
  },
  // 2. Normal group stage match (non-swapped)
  {
    id: 2,
    phase: 'group',
    home_team_id: 'BRA',
    away_team_id: 'COL',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: null
  },
  // 3. Semi-final 1 (ending in draw in backup)
  {
    id: 101,
    phase: 'knockout',
    home_team_id: 'GER',
    away_team_id: 'BRA',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: null
  },
  // 4. Semi-final 2 (ending in draw in backup)
  {
    id: 102,
    phase: 'knockout',
    home_team_id: 'ARG',
    away_team_id: 'FRA',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: null
  },
  // 5. 3rd Place Match (ending in draw in backup)
  {
    id: 103,
    phase: 'knockout',
    home_team_id: 'BRA',
    away_team_id: 'FRA',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: 'BRA' // already set winner in DB
  },
  // 6. Final (ending in draw in backup)
  {
    id: 104,
    phase: 'knockout',
    home_team_id: 'GER',
    away_team_id: 'ARG',
    home_score: null,
    away_score: null,
    home_score_90: null,
    away_score_90: null,
    status: 'scheduled',
    is_manual_override: false,
    winner_team_id: 'GER' // already set winner in DB
  }
];

const mockBackupGames = [
  // 1. Swapped group stage match: South Africa (RSA) vs Mexico (MEX)
  {
    id: '1',
    type: 'group',
    home_team_name_en: 'South Africa',
    away_team_name_en: 'Mexico',
    home_score: '2',
    away_score: '1',
    finished: 'TRUE',
    time_elapsed: 'finished'
  },
  // 2. Normal group stage match: Brazil (BRA) vs Colombia (COL)
  {
    id: '2',
    type: 'group',
    home_team_name_en: 'Brazil',
    away_team_name_en: 'Colombia',
    home_score: '3',
    away_score: '0',
    finished: 'TRUE',
    time_elapsed: 'finished'
  },
  // 3. Semi-final 1: Germany (GER) vs Brazil (BRA) -> ends in 1-1 draw
  {
    id: '101',
    type: 'knockout',
    home_team_name_en: 'Germany',
    away_team_name_en: 'Brazil',
    home_score: '1',
    away_score: '1',
    finished: 'TRUE',
    time_elapsed: 'finished'
  },
  // 4. Semi-final 2: Argentina (ARG) vs France (FRA) -> ends in 2-2 draw
  {
    id: '102',
    type: 'knockout',
    home_team_name_en: 'Argentina',
    away_team_name_en: 'France',
    home_score: '2',
    away_score: '2',
    finished: 'TRUE',
    time_elapsed: 'finished'
  },
  // 5. 3rd Place Match: Brazil vs France -> ends in 0-0 draw
  {
    id: '103',
    type: 'knockout',
    home_team_name_en: 'Brazil',
    away_team_name_en: 'France',
    home_score: '0',
    away_score: '0',
    finished: 'TRUE',
    time_elapsed: 'finished'
  },
  // 6. Final: Germany vs Argentina -> ends in 1-1 draw
  {
    id: '104',
    type: 'knockout',
    home_team_name_en: 'Germany',
    away_team_name_en: 'Argentina',
    home_score: '1',
    away_score: '1',
    finished: 'TRUE',
    time_elapsed: 'finished'
  }
];

// Capture all updates sent to Supabase
const capturedUpdates: Record<number, any> = {};

// Mock fetch
global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString();

  // 1. Primary API check (simulate failure to test backup API fallback)
  if (urlStr.includes('api.football-data.org')) {
    return new Response(JSON.stringify({ message: 'Rate limit' }), { status: 429 });
  }

  // 2. Backup API check
  if (urlStr.includes('worldcup26.ir/get/games')) {
    return new Response(JSON.stringify({ games: mockBackupGames }), { status: 200 });
  }

  // 3. Supabase selects (get local matches)
  if (urlStr.includes('/rest/v1/matches') && init?.method === 'GET') {
    return new Response(JSON.stringify(mockDbMatches), { status: 200 });
  }

  // 4. Supabase updates
  if (urlStr.includes('/rest/v1/matches') && init?.method === 'PATCH') {
    // Extract ID from query param (e.g. ?id=eq.1)
    const matchIdStr = urlStr.split('id=eq.')[1];
    const matchId = parseInt(matchIdStr, 10);
    const body = JSON.parse(init.body as string);
    capturedUpdates[matchId] = body;
    return new Response(JSON.stringify({}), { status: 200 });
  }

  return new Response(JSON.stringify({}), { status: 404 });
};

async function runVerification() {
  console.log('Running Score Sync Verification Tests...');

  // Dynamically import under test to ensure process.env keys are defined before code execution
  const { syncRealScores } = await import('../src/lib/scoreSync');

  const result = await syncRealScores();
  console.log('Sync execution result:', result);

  let success = true;

  // --- Scenario 1 verification: Swapped group stage match score ---
  const match1Update = capturedUpdates[1];
  console.log('Match 1 Update Payload:', match1Update);
  if (!match1Update) {
    console.error('FAIL: No update payload captured for Match 1.');
    success = false;
  } else {
    // DB has MEX vs RSA. Backup has RSA vs MEX (score 2 - 1).
    // Swapping back: MEX score should be 1 (backup away_score), RSA score should be 2 (backup home_score).
    if (match1Update.home_score !== 1 || match1Update.away_score !== 2) {
      console.error(`FAIL: Match 1 scores swapped incorrectly. Expected home=1, away=2. Got home=${match1Update.home_score}, away=${match1Update.away_score}`);
      success = false;
    } else {
      console.log('PASS: Match 1 scores correctly swapped back.');
    }
  }

  // --- Normal group stage match verification ---
  const match2Update = capturedUpdates[2];
  console.log('Match 2 Update Payload:', match2Update);
  if (!match2Update) {
    console.error('FAIL: No update payload captured for Match 2.');
    success = false;
  } else {
    if (match2Update.home_score !== 3 || match2Update.away_score !== 0) {
      console.error(`FAIL: Match 2 scores incorrect. Expected home=3, away=0. Got home=${match2Update.home_score}, away=${match2Update.away_score}`);
      success = false;
    } else {
      console.log('PASS: Match 2 scores correct.');
    }
  }

  // --- Scenario 2 verification: Knockout draw winner resolution ---
  // A. Semi-finals 101 (Germany vs Brazil)
  // Germany plays in final (104). So winner of 101 should be GER.
  const match101Update = capturedUpdates[101];
  console.log('Match 101 Update Payload:', match101Update);
  if (!match101Update) {
    console.error('FAIL: No update payload captured for Match 101.');
    success = false;
  } else {
    if (match101Update.winner_team_id !== 'GER') {
      console.error(`FAIL: Match 101 winner incorrect. Expected GER. Got ${match101Update.winner_team_id}`);
      success = false;
    } else {
      console.log('PASS: Match 101 winner resolved correctly as GER (advanced to final).');
    }
  }

  // B. Semi-finals 102 (Argentina vs France)
  // Argentina plays in final (104). So winner of 102 should be ARG.
  const match102Update = capturedUpdates[102];
  console.log('Match 102 Update Payload:', match102Update);
  if (!match102Update) {
    console.error('FAIL: No update payload captured for Match 102.');
    success = false;
  } else {
    if (match102Update.winner_team_id !== 'ARG') {
      console.error(`FAIL: Match 102 winner incorrect. Expected ARG. Got ${match102Update.winner_team_id}`);
      success = false;
    } else {
      console.log('PASS: Match 102 winner resolved correctly as ARG (advanced to final).');
    }
  }

  // C. 3rd Place Match 103 (Brazil vs France, ended in draw in backup)
  // Winner should remain unchanged (BRA)
  const match103Update = capturedUpdates[103];
  console.log('Match 103 Update Payload:', match103Update);
  if (match103Update && match103Update.winner_team_id !== 'BRA') {
    console.error(`FAIL: Match 103 winner was overwritten. Expected BRA or no change. Got ${match103Update.winner_team_id}`);
    success = false;
  } else {
    console.log('PASS: Match 103 winner remains BRA (unchanged/not overwritten/not set to null).');
  }

  // D. Final 104 (Germany vs Argentina, ended in draw in backup)
  // Winner should remain unchanged (GER)
  const match104Update = capturedUpdates[104];
  console.log('Match 104 Update Payload:', match104Update);
  if (match104Update && match104Update.winner_team_id !== 'GER') {
    console.error(`FAIL: Match 104 winner was overwritten. Expected GER or no change. Got ${match104Update.winner_team_id}`);
    success = false;
  } else {
    console.log('PASS: Match 104 winner remains GER (unchanged/not overwritten/not set to null).');
  }

  if (success) {
    console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } else {
    console.log('\nSOME VERIFICATION TESTS FAILED.');
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal error during verification run:', err);
  process.exit(1);
});
