import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    console.log('Querying profiles...');
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .or('display_name.ilike.%Claudia%,display_name.ilike.%Addemar%');

    if (pError) {
      console.error('Error querying profiles:', pError.message);
      return;
    }

    console.log('Found profiles:', JSON.stringify(profiles, null, 2));

    if (profiles && profiles.length > 0) {
      const userIds = profiles.map(p => p.id);
      console.log('Querying pool_members for these users...');
      const { data: poolMembers, error: pmError } = await supabase
        .from('pool_members')
        .select('*')
        .in('user_id', userIds);

      if (pmError) {
        console.error('Error querying pool_members:', pmError.message);
        return;
      }
      console.log('Found pool_members:', JSON.stringify(poolMembers, null, 2));

      // Also get their predictions count to see if they made any predictions
      for (const user of profiles) {
        const { count: ftCount } = await supabase
          .from('full_tournament_predictions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: phCount } = await supabase
          .from('phase_predictions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: chCount } = await supabase
          .from('champion_predictions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        console.log(`User: ${user.display_name} (${user.id})`);
        console.log(`- full_tournament_predictions count: ${ftCount}`);
        console.log(`- phase_predictions count: ${phCount}`);
        console.log(`- champion_predictions count: ${chCount}`);
      }
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

run();
