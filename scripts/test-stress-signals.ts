import { spawnSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const rootDir = process.cwd();

interface TestRun {
  script: string;
  failureType: string;
}

const tests: TestRun[] = [
  // test-auto-unlock.ts scenarios
  { script: 'scripts/test-auto-unlock.ts', failureType: 'EXCEPTION' },
  { script: 'scripts/test-auto-unlock.ts', failureType: 'SIGINT' },
  { script: 'scripts/test-auto-unlock.ts', failureType: 'SIGTERM' },

  // test-auto-unlock-boundaries.ts scenarios
  { script: 'scripts/test-auto-unlock-boundaries.ts', failureType: 'EXCEPTION' },
  { script: 'scripts/test-auto-unlock-boundaries.ts', failureType: 'SIGINT' },
  { script: 'scripts/test-auto-unlock-boundaries.ts', failureType: 'SIGTERM' },
];

async function runStressSuite() {
  console.log('==================================================');
  console.log('       STARTING STRESS AND SIGNAL TEST SUITE     ');
  console.log('==================================================\n');

  let allPassed = true;

  for (const t of tests) {
    console.log(`\n--------------------------------------------------`);
    console.log(`RUNNING: ${t.script} under SIMULATE_FAILURE=${t.failureType}`);
    console.log(`--------------------------------------------------`);

    // Force cleanup before each run to guarantee clean starting state
    spawnSync('npx', ['tsx', 'scripts/force-cleanup.ts'], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      shell: true
    });

    // Run the script with simulated failure
    const cleanEnv = { ...process.env, SIMULATE_FAILURE: t.failureType };
    delete cleanEnv.NODE_OPTIONS;

    // Spawn script
    const result = spawnSync('npx', ['tsx', t.script], {
      cwd: rootDir,
      env: cleanEnv,
      stdio: 'pipe',
      shell: true
    });

    console.log(`Exit Code: ${result.status}`);
    console.log(`Signal: ${result.signal}`);
    
    // Print first and last few lines of output
    const output = result.stdout.toString() + result.stderr.toString();
    const lines = output.split('\n').filter(line => line.trim() !== '');
    console.log('--- Subprocess Output Snippet ---');
    if (lines.length <= 15) {
      console.log(lines.join('\n'));
    } else {
      console.log(lines.slice(0, 8).join('\n'));
      console.log('...');
      console.log(lines.slice(-8).join('\n'));
    }
    console.log('---------------------------------');

    // Run db cleanliness verification
    const verifyResult = spawnSync('npx', ['tsx', 'scripts/verify-db-clean.ts'], {
      cwd: rootDir,
      env: process.env,
      stdio: 'inherit',
      shell: true
    });

    if (verifyResult.status !== 0) {
      console.error(`❌ FAILED: Database was left dirty after ${t.script} with ${t.failureType}!`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: Database cleaned successfully after ${t.script} with ${t.failureType}.`);
    }
  }

  console.log('\n==================================================');
  if (allPassed) {
    console.log('🎉 SUCCESS: All stress & signal cleanup tests PASSED! 🎉');
    process.exit(0);
  } else {
    console.error('❌ FAILURE: Some stress & signal cleanup tests FAILED.');
    process.exit(1);
  }
}

runStressSuite().catch(err => {
  console.error('Fatal error in stress suite:', err);
  process.exit(1);
});
