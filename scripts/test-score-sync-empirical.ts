import { mockDbState } from './mock-supabase-js';
import { syncRealScores } from '../src/lib/scoreSync';

// Helper to mock global fetch response
function setupMockFetch(responses: { [urlPattern: string]: any }) {
  global.fetch = (url: any, options?: any) => {
    const urlStr = String(url);
    for (const [pattern, data] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve(data),
          text: () => Promise.resolve(JSON.stringify(data))
        } as any);
      }
    }
    return Promise.reject(new Error(`Unhandled fetch call to ${urlStr}`));
  };
}

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, message?: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${message ? ': ' + message : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== STARTING EMPIRICAL SCORE-SYNC VERIFICATION TESTS ===\n');

  // Set required process environment variables for scoreSync to execute
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  process.env.FOOTBALL_API_KEY = ''; // Force fallback to backup API by making primary empty

  // ==========================================
  // Test Case 1: Swapped Team Assignments (Group Phase)
  // Local DB: Home = MEX, Away = RSA
  // Backup API: Home = South Africa (RSA), Away = Mexico (MEX)
  // Scores: Backup has Home (RSA) = 1, Away (MEX) = 3
  // Expected DB: Home (MEX) = 3, Away (RSA) = 1 (Scores swapped back)
  // ==========================================
  try {
    mockDbState.clear();
    mockDbState.setMatches([
      {
        id: 1,
        phase: 'group',
        home_team_id: 'MEX',
        away_team_id: 'RSA',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        home_score_90: null,
        away_score_90: null,
        external_match_id: 'ext-1',
        is_manual_override: false
      }
    ]);

    setupMockFetch({
      'worldcup26.ir/get/games': {
        games: [
          {
            id: '1',
            type: 'group',
            finished: 'TRUE',
            time_elapsed: 'finished',
            home_score: '1',
            away_score: '3',
            home_team_name_en: 'South Africa',
            away_team_name_en: 'Mexico'
          }
        ]
      }
    });

    const result = await syncRealScores();
    const calls = mockDbState.getUpdateCalls();

    assert(
      'Case 1: Group stage swapped matches - sync runs successfully',
      result.success === true && result.updatedCount === 1,
      `result.success: ${result.success}, updatedCount: ${result.updatedCount}`
    );

    assert(
      'Case 1: Group stage swapped matches - database updated exactly once',
      calls.length === 1,
      `calls.length: ${calls.length}`
    );

    if (calls.length === 1) {
      const call = calls[0];
      assert('Case 1: Group stage swapped matches - correct match ID targeted', call.id === 1);
      assert('Case 1: Group stage swapped matches - status updated to finished', call.payload.status === 'finished');
      assert(
        'Case 1: Group stage swapped matches - home score correctly swapped to 3 (MEX)',
        call.payload.home_score === 3,
        `Expected 3, got ${call.payload.home_score}`
      );
      assert(
        'Case 1: Group stage swapped matches - away score correctly swapped to 1 (RSA)',
        call.payload.away_score === 1,
        `Expected 1, got ${call.payload.away_score}`
      );
      assert('Case 1: Group stage swapped matches - home score 90 updated to 3', call.payload.home_score_90 === 3);
      assert('Case 1: Group stage swapped matches - away score 90 updated to 1', call.payload.away_score_90 === 1);
    }
  } catch (err: any) {
    assert('Case 1: Group stage swapped matches - exception thrown', false, err.stack || err.message);
  }

  // ==========================================
  // Test Case 2: Semi-Final Draw (ID 101)
  // Local DB: 101 (MEX vs RSA), 104 (Final: MEX vs GER)
  // Backup API: 101 ended in a draw (2-2), 104 is scheduled (MEX vs GER)
  // Expected DB: Match 101 winner resolves to MEX (since MEX is in the Final)
  // ==========================================
  try {
    mockDbState.clear();
    mockDbState.setMatches([
      {
        id: 101,
        phase: 'semi',
        home_team_id: 'MEX',
        away_team_id: 'RSA',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        home_score_90: null,
        away_score_90: null,
        winner_team_id: null,
        external_match_id: 'ext-101',
        is_manual_override: false
      },
      {
        id: 104,
        phase: 'final',
        home_team_id: 'MEX',
        away_team_id: 'GER',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        home_score_90: null,
        away_score_90: null,
        winner_team_id: null,
        external_match_id: 'ext-104',
        is_manual_override: false
      }
    ]);

    setupMockFetch({
      'worldcup26.ir/get/games': {
        games: [
          {
            id: '101',
            type: 'semi',
            finished: 'TRUE',
            time_elapsed: 'finished',
            home_score: '2',
            away_score: '2',
            home_team_name_en: 'Mexico',
            away_team_name_en: 'South Africa'
          },
          {
            id: '104',
            type: 'final',
            finished: 'FALSE',
            time_elapsed: 'notstarted',
            home_score: null,
            away_score: null,
            home_team_name_en: 'Mexico',
            away_team_name_en: 'Germany'
          }
        ]
      }
    });

    const result = await syncRealScores();
    const calls = mockDbState.getUpdateCalls();

    const call101 = calls.find(c => c.id === 101);
    assert('Case 2: Semi-final draw - Match 101 updated', !!call101);

    if (call101) {
      assert('Case 2: Semi-final draw - Match 101 status is finished', call101.payload.status === 'finished');
      assert('Case 2: Semi-final draw - Match 101 home score is 2', call101.payload.home_score === 2);
      assert('Case 2: Semi-final draw - Match 101 away score is 2', call101.payload.away_score === 2);
      assert(
        'Case 2: Semi-final draw - Match 101 winner correctly resolved to MEX based on Final (104)',
        call101.payload.winner_team_id === 'MEX',
        `Expected MEX, got ${call101.payload.winner_team_id}`
      );
    }
  } catch (err: any) {
    assert('Case 2: Semi-final draw - exception thrown', false, err.stack || err.message);
  }

  // ==========================================
  // Test Case 3: Final Draw (ID 104)
  // Local DB: 104 (MEX vs GER) with existing winner MEX
  // Backup API: 104 ended in a draw (1-1)
  // Expected DB: Winner remains MEX (unchanged)
  // ==========================================
  try {
    mockDbState.clear();
    mockDbState.setMatches([
      {
        id: 104,
        phase: 'final',
        home_team_id: 'MEX',
        away_team_id: 'GER',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        home_score_90: null,
        away_score_90: null,
        winner_team_id: 'MEX',
        external_match_id: 'ext-104',
        is_manual_override: false
      }
    ]);

    setupMockFetch({
      'worldcup26.ir/get/games': {
        games: [
          {
            id: '104',
            type: 'final',
            finished: 'TRUE',
            time_elapsed: 'finished',
            home_score: '1',
            away_score: '1',
            home_team_name_en: 'Mexico',
            away_team_name_en: 'Germany'
          }
        ]
      }
    });

    const result = await syncRealScores();
    const calls = mockDbState.getUpdateCalls();

    const call104 = calls.find(c => c.id === 104);
    assert('Case 3: Final draw - Match 104 updated', !!call104);

    if (call104) {
      assert('Case 3: Final draw - Match 104 status is finished', call104.payload.status === 'finished');
      assert('Case 3: Final draw - Match 104 home score is 1', call104.payload.home_score === 1);
      assert('Case 3: Final draw - Match 104 away score is 1', call104.payload.away_score === 1);
      assert(
        'Case 3: Final draw - Match 104 winner remains MEX (unchanged)',
        call104.payload.winner_team_id === 'MEX',
        `Expected MEX, got ${call104.payload.winner_team_id}`
      );
    }
  } catch (err: any) {
    assert('Case 3: Final draw - exception thrown', false, err.stack || err.message);
  }

  // ==========================================
  // Test Case 4: 3rd Place Match Draw (ID 103)
  // Local DB: 103 (RSA vs ENG) with existing winner ENG
  // Backup API: 103 ended in a draw (0-0)
  // Expected DB: Winner remains ENG (unchanged)
  // ==========================================
  try {
    mockDbState.clear();
    mockDbState.setMatches([
      {
        id: 103,
        phase: 'third',
        home_team_id: 'RSA',
        away_team_id: 'ENG',
        status: 'scheduled',
        home_score: null,
        away_score: null,
        home_score_90: null,
        away_score_90: null,
        winner_team_id: 'ENG',
        external_match_id: 'ext-103',
        is_manual_override: false
      }
    ]);

    setupMockFetch({
      'worldcup26.ir/get/games': {
        games: [
          {
            id: '103',
            type: 'third',
            finished: 'TRUE',
            time_elapsed: 'finished',
            home_score: '0',
            away_score: '0',
            home_team_name_en: 'South Africa',
            away_team_name_en: 'England'
          }
        ]
      }
    });

    const result = await syncRealScores();
    const calls = mockDbState.getUpdateCalls();

    const call103 = calls.find(c => c.id === 103);
    assert('Case 4: 3rd Place Match draw - Match 103 updated', !!call103);

    if (call103) {
      assert('Case 4: 3rd Place Match draw - Match 103 status is finished', call103.payload.status === 'finished');
      assert('Case 4: 3rd Place Match draw - Match 103 home score is 0', call103.payload.home_score === 0);
      assert('Case 4: 3rd Place Match draw - Match 103 away score is 0', call103.payload.away_score === 0);
      assert(
        'Case 4: 3rd Place Match draw - Match 103 winner remains ENG (unchanged)',
        call103.payload.winner_team_id === 'ENG',
        `Expected ENG, got ${call103.payload.winner_team_id}`
      );
    }
  } catch (err: any) {
    assert('Case 4: 3rd Place Match draw - exception thrown', false, err.stack || err.message);
  }

  // ==========================================
  // Test Case 5: Semi-Final Draw (ID 101) when Final (104) is missing
  // Local DB: 101 has existing winner MEX, and status finished.
  // Backup API: 101 ended in a draw (2-2), but 104 is missing.
  // Expected: Does the winner get set to null, overwriting the DB?
  // ==========================================
  try {
    mockDbState.clear();
    mockDbState.setMatches([
      {
        id: 101,
        phase: 'semi',
        home_team_id: 'MEX',
        away_team_id: 'RSA',
        status: 'finished',
        home_score: 2,
        away_score: 2,
        home_score_90: 2,
        away_score_90: 2,
        winner_team_id: 'MEX',
        external_match_id: 'ext-101',
        is_manual_override: false
      }
    ]);

    setupMockFetch({
      'worldcup26.ir/get/games': {
        games: [
          {
            id: '101',
            type: 'semi',
            finished: 'TRUE',
            time_elapsed: 'finished',
            home_score: '2',
            away_score: '2',
            home_team_name_en: 'Mexico',
            away_team_name_en: 'South Africa'
          }
        ]
      }
    });

    const result = await syncRealScores();
    const calls = mockDbState.getUpdateCalls();

    const call101 = calls.find(c => c.id === 101);
    
    if (call101) {
      assert(
        'Case 5: Semi-final draw with missing Final - does NOT overwrite winner to null',
        call101.payload.winner_team_id !== null && call101.payload.winner_team_id === 'MEX',
        `Winner was set to: ${call101.payload.winner_team_id}`
      );
    } else {
      assert('Case 5: Semi-final draw with missing Final - no overwrite to null', true);
    }
  } catch (err: any) {
    assert('Case 5: Semi-final draw with missing Final - exception thrown', false, err.stack || err.message);
  }

  console.log('\n=== EMPIRICAL SCORE-SYNC TESTS SUMMARY ===');
  console.log(`Passed: ${passed} / ${passed + failed}`);
  console.log(`Failed: ${failed} / ${passed + failed}`);

  if (failed > 0) {
    console.error('\x1b[31mScore sync verification failed.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mAll score sync verification tests passed successfully!\x1b[0m');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
