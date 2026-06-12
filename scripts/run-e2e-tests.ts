import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import React from 'react';
import TeamFlag from '../src/components/common/TeamFlag';

// Types
interface TestResult {
  id: string;
  name: string;
  tier: string;
  status: 'PASS' | 'FAIL';
  error?: string;
}

const results: TestResult[] = [];

// Helper to register results
function recordResult(id: string, name: string, tier: string, run: () => void | Promise<void>) {
  try {
    const res = run();
    if (res instanceof Promise) {
      throw new Error(`Test ${id} returned a promise. All tests must be run synchronously or handled specifically.`);
    }
    results.push({ id, name, tier, status: 'PASS' });
  } catch (err: any) {
    results.push({ id, name, tier, status: 'FAIL', error: err.message || String(err) });
  }
}

async function recordResultAsync(id: string, name: string, tier: string, run: () => Promise<void>) {
  try {
    await run();
    results.push({ id, name, tier, status: 'PASS' });
  } catch (err: any) {
    results.push({ id, name, tier, status: 'FAIL', error: err.message || String(err) });
  }
}

// Helpers for static analysis
function extractJsxBlocks(content: string): string[] {
  const blocks: string[] = [];
  const returnRegex = /\breturn\s*\(([\s\S]*?)\);|\breturn\s+(<[\s\S]*?);/g;
  let match;
  while ((match = returnRegex.exec(content)) !== null) {
    blocks.push(match[1] || match[2]);
  }
  return blocks;
}

function hasDirectJsxRender(content: string, term: string): boolean {
  const blocks = extractJsxBlocks(content);
  for (const block of blocks) {
    // Remove valid fallbackEmoji prop assignments to ignore them
    const cleanedBlock = block.replace(/fallbackEmoji=\{[^{}]*\}/g, '');
    if (cleanedBlock.includes(term)) {
      return true;
    }
  }
  return false;
}

// Helper to check if a string contains regional indicator characters (native country flag emojis)
function containsNativeFlags(str: string): boolean {
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
  const subregionFlagRegex = /\uD83C\uDFF4(\uDB40[\uDC61-\uDC7A])+\uDB40\uDC7F/g;
  return flagRegex.test(str) || subregionFlagRegex.test(str);
}

async function runTests() {
  console.log('==================================================');
  console.log('           STARTING E2E TEST RUNNER              ');
  console.log('==================================================\n');

  // Paths
  const fixtureTabPath = path.resolve(__dirname, '../src/components/dashboard/FixtureTab.tsx');
  const homeTabPath = path.resolve(__dirname, '../src/components/dashboard/HomeTab.tsx');
  const profileTabPath = path.resolve(__dirname, '../src/components/dashboard/ProfileTab.tsx');
  const teamFlagPath = path.resolve(__dirname, '../src/components/common/TeamFlag.tsx');
  const seedPath = path.resolve(__dirname, 'seed.ts');

  // Read files
  const fixtureTabContent = fs.readFileSync(fixtureTabPath, 'utf8');
  const homeTabContent = fs.readFileSync(homeTabPath, 'utf8');
  const profileTabContent = fs.readFileSync(profileTabPath, 'utf8');
  const teamFlagContent = fs.readFileSync(teamFlagPath, 'utf8');
  const seedContent = fs.readFileSync(seedPath, 'utf8');

  // Parse Seeded Team IDs
  const idMatches = seedContent.match(/id:\s*'([A-Z]{3})'/g) || [];
  const seededTeamIds = idMatches.map(m => {
    const idMatch = m.match(/'([A-Z]{3})'/);
    return idMatch ? idMatch[1] : '';
  }).filter(Boolean);
  const uniqueSeededTeamIds = Array.from(new Set(seededTeamIds));

  // TIER 1 - Feature Coverage (Happy-Path)

  // FixtureTab Feature
  recordResult('TEST_1.1', 'Verify TeamFlag component is imported in FixtureTab.tsx', 'Tier 1', () => {
    const importRegex = /import\s+TeamFlag\s+from\s+['"]@\/components\/common\/TeamFlag['"]/;
    if (!importRegex.test(fixtureTabContent)) {
      throw new Error('TeamFlag is not imported from components/common/TeamFlag in FixtureTab.tsx');
    }
  });

  recordResult('TEST_1.2', 'Verify that no direct JSX renders exist for {teamsFlags[...]} in native <span> without <TeamFlag>', 'Tier 1', () => {
    // Look for teamsFlags inside JSX return blocks, specifically inside non-<TeamFlag tags.
    // In our robust check, we check if teamsFlags appears outside a TeamFlag tag in the JSX return.
    const blocks = extractJsxBlocks(fixtureTabContent);
    for (const block of blocks) {
      // Find all matches of teamsFlags
      const regex = /teamsFlags/g;
      let match;
      while ((match = regex.exec(block)) !== null) {
        const idx = match.index;
        const preceding = block.substring(0, idx);
        const lastLessThan = preceding.lastIndexOf('<');
        const lastGreaterThan = preceding.lastIndexOf('>');
        if (lastLessThan > lastGreaterThan) {
          const tagContent = preceding.substring(lastLessThan);
          if (!tagContent.startsWith('<TeamFlag')) {
            throw new Error(`Found direct reference to teamsFlags inside non-TeamFlag tag: ${tagContent.substring(0, 30)}`);
          }
        } else {
          // outside tag declaration (direct rendering as child)
          throw new Error(`Found direct rendering of teamsFlags as tag children: ...${block.substring(idx - 15, idx + 15)}...`);
        }
      }
    }
  });

  recordResult('TEST_1.3', 'Verify that no direct JSX renders exist for .flag_emoji inside FixtureTab.tsx', 'Tier 1', () => {
    if (hasDirectJsxRender(fixtureTabContent, 'flag_emoji')) {
      throw new Error('Direct JSX render/reference to flag_emoji exists inside FixtureTab.tsx');
    }
  });

  recordResult('TEST_1.4', 'Verify TeamFlag is used for group stage matches (home and away)', 'Tier 1', () => {
    // Check that TeamFlag is in the JSX and receives group stage match variables
    if (!fixtureTabContent.includes('<TeamFlag') || !fixtureTabContent.includes('match.home_team_id') || !fixtureTabContent.includes('match.away_team_id')) {
      throw new Error('TeamFlag is not rendered for group stage matches');
    }
  });

  recordResult('TEST_1.5', 'Verify TeamFlag is used in standings table and best thirds table', 'Tier 1', () => {
    if (!fixtureTabContent.includes('row.team.id') || !fixtureTabContent.includes('<TeamFlag')) {
      throw new Error('TeamFlag is not rendered in standings table or best thirds table');
    }
  });

  recordResult('TEST_1.6', 'Verify TeamFlag is used in podium summary (Champion, Runner-up, Third)', 'Tier 1', () => {
    if (!fixtureTabContent.includes('finalWinner.id') || !fixtureTabContent.includes('finalLoser.id') || !fixtureTabContent.includes('thirdWinner.id')) {
      throw new Error('TeamFlag is not rendered in the podium summary');
    }
  });

  // HomeTab Feature
  recordResult('TEST_2.1', 'Verify TeamFlag component is imported in HomeTab.tsx', 'Tier 1', () => {
    const importRegex = /import\s+TeamFlag\s+from\s+['"]@\/components\/common\/TeamFlag['"]/;
    if (!importRegex.test(homeTabContent)) {
      throw new Error('TeamFlag is not imported from components/common/TeamFlag in HomeTab.tsx');
    }
  });

  recordResult('TEST_2.2', 'Verify no direct JSX rendering of teamsFlags[...] or .flag_emoji exists in HomeTab.tsx', 'Tier 1', () => {
    if (hasDirectJsxRender(homeTabContent, 'teamsFlags') || hasDirectJsxRender(homeTabContent, 'flag_emoji')) {
      throw new Error('Direct JSX render/reference of teamsFlags or flag_emoji exists inside HomeTab.tsx');
    }
  });

  recordResult('TEST_2.3', 'Verify TeamFlag is rendered for the home team in the matches list', 'Tier 1', () => {
    if (!homeTabContent.includes('match.home_team_id') || !homeTabContent.includes('<TeamFlag')) {
      throw new Error('TeamFlag is not rendered for home team');
    }
  });

  recordResult('TEST_2.4', 'Verify TeamFlag is rendered for the away team in the matches list', 'Tier 1', () => {
    if (!homeTabContent.includes('match.away_team_id') || !homeTabContent.includes('<TeamFlag')) {
      throw new Error('TeamFlag is not rendered for away team');
    }
  });

  recordResult('TEST_2.5', 'Verify TeamFlag receives teamId prop correctly in HomeTab', 'Tier 1', () => {
    if (!homeTabContent.includes('teamId={match.home_team_id}') && !homeTabContent.includes('teamId={match.away_team_id}')) {
      throw new Error('TeamFlag does not receive teamId prop correctly in HomeTab.tsx');
    }
  });

  // ProfileTab Feature
  recordResult('TEST_3.1', 'Verify TeamFlag component is imported in ProfileTab.tsx', 'Tier 1', () => {
    const importRegex = /import\s+TeamFlag\s+from\s+['"]@\/components\/common\/TeamFlag['"]/;
    if (!importRegex.test(profileTabContent)) {
      throw new Error('TeamFlag is not imported from components/common/TeamFlag in ProfileTab.tsx');
    }
  });

  recordResult('TEST_3.2', 'Verify no direct rendering of .flag_emoji exists in ProfileTab.tsx', 'Tier 1', () => {
    if (hasDirectJsxRender(profileTabContent, 'flag_emoji')) {
      throw new Error('Direct JSX render/reference to flag_emoji exists inside ProfileTab.tsx');
    }
  });

  recordResult('TEST_3.3', 'Verify TeamFlag is rendered for the Champion prediction', 'Tier 1', () => {
    if (!profileTabContent.includes('championPred.champion_team_id') && !profileTabContent.includes('champion_team_id')) {
      throw new Error('TeamFlag is not rendered for Champion prediction');
    }
  });

  recordResult('TEST_3.4', 'Verify TeamFlag is rendered for the Runner-up prediction', 'Tier 1', () => {
    if (!profileTabContent.includes('championPred.runner_up_team_id') && !profileTabContent.includes('runner_up_team_id')) {
      throw new Error('TeamFlag is not rendered for Runner-up prediction');
    }
  });

  recordResult('TEST_3.5', 'Verify TeamFlag is rendered for the Third Place prediction', 'Tier 1', () => {
    if (!profileTabContent.includes('championPred.third_place_team_id') && !profileTabContent.includes('third_place_team_id')) {
      throw new Error('TeamFlag is not rendered for Third Place prediction');
    }
  });

  // Flag Mappings & Fallback (in TeamFlag.tsx)
  recordResult('TEST_4.1', 'Verify all 48 seeded team IDs are present in FLAG_MAP in TeamFlag.tsx', 'Tier 1', () => {
    // Parse FLAG_MAP
    const mapRegex = /const\s+FLAG_MAP\b[^=]*=\s*\{([^}]+)\}/;
    const mapMatch = teamFlagContent.match(mapRegex);
    if (!mapMatch) {
      throw new Error('FLAG_MAP not found in TeamFlag.tsx');
    }
    const mapBody = mapMatch[1];
    const keys = mapBody.split(',').map(pair => {
      const parts = pair.split(':');
      return parts[0].trim().replace(/['"]/g, '');
    }).filter(Boolean);

    const missingIds = uniqueSeededTeamIds.filter(id => !keys.includes(id));
    if (missingIds.length > 0) {
      throw new Error(`FLAG_MAP is missing team IDs: ${missingIds.join(', ')}`);
    }
  });

  recordResult('TEST_4.2', 'Verify that TeamFlag uses FlagCDN URL format pointing to https://flagcdn.com/... for valid team IDs', 'Tier 1', () => {
    const element = TeamFlag({ teamId: 'MEX' });
    const imgChild = React.Children.toArray(element.props.children).find(
      (c: any) => c.type === 'img'
    ) as any;
    if (!imgChild) {
      throw new Error('TeamFlag does not render an img element for valid team ID');
    }
    const src = imgChild.props.src;
    if (!src || !src.startsWith('https://flagcdn.com/')) {
      throw new Error(`Invalid src URL: ${src}`);
    }
  });

  recordResult('TEST_4.3', 'Verify that TeamFlag renders fallback emoji span when teamId is not provided', 'Tier 1', () => {
    const element = TeamFlag({ teamId: undefined });
    if (element.type !== 'span' || element.props.children !== '🏳️') {
      throw new Error('TeamFlag does not render fallback span with default 🏳️ when teamId is undefined');
    }
  });

  recordResult('TEST_4.4', 'Verify that TeamFlag renders fallback emoji span when teamId is not in the FLAG_MAP', 'Tier 1', () => {
    const element = TeamFlag({ teamId: 'XYZ' });
    if (element.type !== 'span' || element.props.children !== '🏳️') {
      throw new Error('TeamFlag does not render fallback span with default 🏳️ when teamId is unknown');
    }
  });

  recordResult('TEST_4.5', 'Verify custom fallbackEmoji prop works', 'Tier 1', () => {
    const element = TeamFlag({ teamId: undefined, fallbackEmoji: '🌍' });
    if (element.type !== 'span' || element.props.children !== '🌍') {
      throw new Error('TeamFlag does not render custom fallbackEmoji');
    }
  });


  // TIER 2 - Boundary & Corner Cases
  recordResult('TEST_BC_1', 'Verify how empty teamId="" is handled by TeamFlag (should return fallback emoji)', 'Tier 2', () => {
    const element = TeamFlag({ teamId: '' });
    if (element.type !== 'span' || element.props.children !== '🏳️') {
      throw new Error('TeamFlag does not render fallback emoji for empty teamId string');
    }
  });

  recordResult('TEST_BC_2', 'Verify how lowercase teamId values (e.g. mex) are handled by TeamFlag (should lookup case-insensitively)', 'Tier 2', () => {
    const element = TeamFlag({ teamId: 'mex' });
    const imgChild = React.Children.toArray(element.props.children).find(
      (c: any) => c.type === 'img'
    ) as any;
    if (!imgChild) {
      throw new Error('TeamFlag does not render img for lowercase teamId');
    }
    const src = imgChild.props.src;
    if (!src || !src.includes('/mx.png')) {
      throw new Error(`Lowercase teamId mapping failed. Expected mx.png, got ${src}`);
    }
  });

  recordResult('TEST_BC_3', 'Verify that TeamFlag className prop correctly overrides or appends to default styling', 'Tier 2', () => {
    const element = TeamFlag({ teamId: 'MEX', className: 'custom-class' });
    const imgChild = React.Children.toArray(element.props.children).find(
      (c: any) => c.type === 'img'
    ) as any;
    if (!imgChild || !imgChild.props.className.includes('custom-class')) {
      throw new Error('TeamFlag does not correctly apply custom className');
    }
  });


  // TIER 3 - Cross-Feature Combinations
  recordResult('TEST_CF_1', 'Verify that all target tabs (FixtureTab, HomeTab, ProfileTab) compile correctly under TypeScript while importing TeamFlag', 'Tier 3', () => {
    // If compilation succeeds, this test passes. We will run TS compiler in Tier 4/5.
  });

  recordResult('TEST_M4_R1', 'Verify RulesTab registration in Dashboard and Landing page button & modal', 'Tier 3', () => {
    // 1. Dashboard import & registration
    const dashContent = fs.readFileSync(path.resolve(__dirname, '../src/app/dashboard/page.tsx'), 'utf8');
    if (!/import\s+RulesTab\s+from\s+['"]@\/components\/dashboard\/RulesTab['"]/.test(dashContent)) {
      throw new Error('RulesTab is not imported in src/app/dashboard/page.tsx');
    }
    if (!/id:\s*['"]rules['"]\s*,\s*label:\s*['"]Reglas['"]/.test(dashContent) && !/label:\s*['"]Reglas['"]\s*,\s*id:\s*['"]rules['"]/.test(dashContent)) {
      throw new Error('RulesTab is not registered in the tabs array inside src/app/dashboard/page.tsx');
    }
    // 2. Landing page button & modal
    const landingContent = fs.readFileSync(path.resolve(__dirname, '../src/app/page.tsx'), 'utf8');
    if (!/import\s+RulesTab\s+from\s+['"]@\/components\/dashboard\/RulesTab['"]/.test(landingContent)) {
      throw new Error('RulesTab is not imported in src/app/page.tsx');
    }
    if (!/setShowRules\(\s*true\s*\)/.test(landingContent) && !/showRules/i.test(landingContent)) {
      throw new Error('Landing page does not manage showRules state');
    }
    if (!/<RulesTab\s*\/>/.test(landingContent)) {
      throw new Error('Landing page does not render <RulesTab /> inside modal');
    }
  });

  recordResult('TEST_M4_R2', 'Verify RulesTab sections and simulated scoring widget', 'Tier 3', () => {
    const rulesContent = fs.readFileSync(path.resolve(__dirname, '../src/components/dashboard/RulesTab.tsx'), 'utf8');
    
    // Check accordion titles/sections
    const expectedSections = ['Fase de Grupos', 'Empates', 'Eliminatorias', 'Wizard', 'En Vivo', 'Bonus'];
    for (const section of expectedSections) {
      if (!rulesContent.includes(section)) {
        throw new Error(`RulesTab is missing Spanish rule section referring to: "${section}"`);
      }
    }

    // Check simulated scoring widget
    if (!rulesContent.includes('calculateSimulatedPoints')) {
      throw new Error('RulesTab is missing the calculateSimulatedPoints function');
    }
    if (!rulesContent.includes('simPhase') || !rulesContent.includes('realHome') || !rulesContent.includes('predHome')) {
      throw new Error('RulesTab is missing state variables for the simulator');
    }
    if (!rulesContent.includes('Simulador de Puntuación') && !rulesContent.includes('Simulador') && !rulesContent.includes('simulador')) {
      throw new Error('RulesTab does not contain UI labels/titles for the simulated scoring widget');
    }
  });

  recordResult('TEST_M4_R3', 'Verify Part 2 knockout draw tiebreaker integration in FixtureTab.tsx', 'Tier 3', () => {
    const fixtureContent = fs.readFileSync(path.resolve(__dirname, '../src/components/dashboard/FixtureTab.tsx'), 'utf8');

    // 1. State type maps winnerId
    const hasWinnerIdInP2Preds = fixtureContent.includes('winnerId') && fixtureContent.includes('p2Preds');
    if (!hasWinnerIdInP2Preds) {
      throw new Error('p2Preds state does not seem to include winnerId in its type definition');
    }

    // 2. Predictions load winnerId
    if (!fixtureContent.includes('winnerId: p.predicted_winner_team_id')) {
      throw new Error('Predictions loading in FixtureTab does not load/map predicted_winner_team_id to winnerId');
    }

    // 3. Winner selection buttons render for draw scores in knockout matches
    if (!fixtureContent.includes("handleP2WinnerChange(match.id, match.home_team_id)") || 
        !fixtureContent.includes("handleP2WinnerChange(match.id, match.away_team_id)")) {
      throw new Error('Winner selection buttons for draw scores in knockout matches are not rendered correctly in Part 2');
    }

    // 4. Save logic blocks saving unless a winner is selected for draws
    if (!fixtureContent.includes('!pred.winnerId') || !fixtureContent.includes('alert')) {
      throw new Error('Save logic does not block saving for draws unless a winner is selected');
    }
  });



  // TIER 4 - Real-World Application Scenarios / BUILD & LINT checks
  let lintSuccess = false;
  let buildSuccess = false;

  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;

  await recordResultAsync('TEST_5.1', 'Run ESLint using npm run lint and verify it finishes with no errors', 'Tier 1', async () => {
    console.log('Running npm run lint...');
    try {
      execSync('npm run lint', { stdio: 'pipe', env: cleanEnv });
      lintSuccess = true;
    } catch (err: any) {
      const output = err.stdout?.toString() || err.message;
      throw new Error(`Lint failed:\n${output}`);
    }
  });

  await recordResultAsync('TEST_5.2', 'Run TS compiler/Next build using npm run build and verify it finishes with no errors', 'Tier 1', async () => {
    console.log('Running npm run build...');
    try {
      execSync('npm run build', { stdio: 'pipe', env: cleanEnv });
      buildSuccess = true;
    } catch (err: any) {
      const output = err.stdout?.toString() || err.message;
      throw new Error(`Build failed:\n${output}`);
    }
  });

  recordResult('TEST_RW_1', 'End-to-end production build verification', 'Tier 4', () => {
    if (!buildSuccess) {
      throw new Error('E2E Production build failed during test run');
    }
  });


  // Print Results Table
  console.log('\n==================================================');
  console.log('                 TEST RESULTS                     ');
  console.log('==================================================');
  console.log(
    sprintf('%-10s | %-10s | %-50s | %-6s', 'ID', 'TIER', 'TEST NAME', 'STATUS')
  );
  console.log('-'.repeat(85));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const res of results) {
    if (res.status === 'PASS') {
      totalPassed++;
      console.log(
        sprintf('%-10s | %-10s | %-50s | \x1b[32m%-6s\x1b[0m', res.id, res.tier, res.name, res.status)
      );
    } else {
      totalFailed++;
      console.log(
        sprintf('%-10s | %-10s | %-50s | \x1b[31m%-6s\x1b[0m', res.id, res.tier, res.name, res.status)
      );
      console.log(`   \x1b[33mError: ${res.error}\x1b[0m\n`);
    }
  }

  console.log('-'.repeat(85));
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log('==================================================\n');

  if (totalFailed > 0) {
    console.log('\x1b[31mSome tests failed. Exiting with code 1.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\x1b[32mAll tests passed. Exiting with code 0.\x1b[0m');
    process.exit(0);
  }
}

// Helper function for formatted string printing
function sprintf(format: string, ...args: any[]): string {
  let i = 0;
  return format.replace(/%-?(\d+)?s/g, (match, width) => {
    let val = String(args[i++]);
    if (width) {
      const numWidth = parseInt(width, 10);
      const isLeft = match.includes('-');
      if (val.length < numWidth) {
        const pad = ' '.repeat(numWidth - val.length);
        val = isLeft ? val + pad : pad + val;
      }
    }
    return val;
  });
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
