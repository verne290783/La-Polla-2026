import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*');

  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }

  console.log('--- ALL PROFILES ---');
  for (const profile of profiles) {
    console.log(`ID: ${profile.id} | Email: ${profile.email} | Display Name: ${profile.display_name} | P1: ${profile.part1_points} | P2: ${profile.part2_points} | Total: ${profile.total_points}`);
  }

  console.log('\n--- TARGET USERS INVESTIGATION ---');
  const targets = profiles.filter(p => 
    (profileNameMatches(p.display_name) || profileNameMatches(p.email))
  );

  function profileNameMatches(str: string | null) {
    if (!str) return false;
    const s = str.toLowerCase();
    return s.includes('claudia') || s.includes('romero') || s.includes('addemar') || s.includes('avila') || s.includes('ávila');
  }

  console.log('Targets found:', targets.map(t => ({ id: t.id, display_name: t.display_name, email: t.email })));

  for (const target of targets) {
    console.log(`\nInvestigating target: ${target.display_name} (${target.email})`);
    
    // Pool memberships
    const { data: members, error: mError } = await supabase
      .from('pool_members')
      .select('*, pools(name)')
      .eq('user_id', target.id);

    console.log('  Pool memberships:');
    if (members) {
      for (const m of members) {
        console.log(`    Pool ID: ${m.pool_id} | Pool Name: ${(m as any).pools?.name} | P1: ${m.part1_points} | P2: ${m.part2_points} | Total: ${m.total_points}`);
      }
    }

    // Champion Predictions
    const { data: champPreds } = await supabase
      .from('champion_predictions')
      .select('*')
      .eq('user_id', target.id);
    console.log('  Champion Predictions count:', champPreds?.length);
    if (champPreds && champPreds.length > 0) {
      console.log('  Champion Predictions:', champPreds);
    }

    // Full Tournament Predictions
    const { data: fullPreds } = await supabase
      .from('full_tournament_predictions')
      .select('*')
      .eq('user_id', target.id);
    console.log('  Full Tournament Predictions count:', fullPreds?.length);

    // Phase Predictions
    const { data: phasePreds } = await supabase
      .from('phase_predictions')
      .select('*')
      .eq('user_id', target.id);
    console.log('  Phase Predictions count:', phasePreds?.length);
  }
}

run();
