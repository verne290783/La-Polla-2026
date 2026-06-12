import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncRealScores } from '@/lib/scoreSync';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // STEP A: Query get_app_time()
    const { data: appTime, error: appTimeError } = await supabase.rpc('get_app_time');
    if (appTimeError || !appTime) {
      console.error('Error in GET /api/matches/sync while fetching app time:', appTimeError);
      return NextResponse.json(
        { error: 'Failed to fetch application time' },
        { status: 500 }
      );
    }

    // Query matches: status != 'finished' and match_date <= appTime
    const { data: activeMatches, error: activeMatchesError } = await supabase
      .from('matches')
      .select('id, status, match_date')
      .neq('status', 'finished')
      .lte('match_date', appTime);

    if (activeMatchesError) {
      console.error('Error in GET /api/matches/sync while fetching active matches:', activeMatchesError);
      return NextResponse.json(
        { error: 'Failed to query active matches' },
        { status: 500 }
      );
    }

    const activeMatchesList = activeMatches || [];
    const activeMatchesCount = activeMatchesList.length;

    // STEP B: If 0 matches are found, return { activeMatchesCount: 0 } immediately
    if (activeMatchesCount === 0) {
      return NextResponse.json({ activeMatchesCount: 0 }, { status: 200 });
    }

    // STEP C: Check last_sync_time in system_settings
    const { data: lastSyncSetting, error: lastSyncError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'last_sync_time')
      .maybeSingle();

    if (lastSyncError) {
      console.error('Error in GET /api/matches/sync while fetching last_sync_time:', lastSyncError);
      return NextResponse.json(
        { error: 'Failed to fetch last sync time' },
        { status: 500 }
      );
    }

    if (lastSyncSetting && lastSyncSetting.value) {
      const currentAppDate = new Date(appTime);
      const lastSyncDate = new Date(lastSyncSetting.value);
      const diffMs = currentAppDate.getTime() - lastSyncDate.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 2) {
        return NextResponse.json(
          { activeMatchesCount, synced: false },
          { status: 200 }
        );
      }
    }

    // STEP D: Update last_sync_time, run sync, compute points if finished
    const { error: upsertError } = await supabase
      .from('system_settings')
      .upsert(
        { key: 'last_sync_time', value: appTime },
        { onConflict: 'key' }
      );

    if (upsertError) {
      console.error('Error in GET /api/matches/sync while updating last_sync_time:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update last sync time' },
        { status: 500 }
      );
    }

    // Call syncRealScores
    await syncRealScores();

    // Query active matches again to find transitioned ones
    const activeMatchIds = activeMatchesList.map(m => m.id);
    const { data: updatedMatches, error: updatedMatchesError } = await supabase
      .from('matches')
      .select('id, status')
      .in('id', activeMatchIds);

    if (updatedMatchesError) {
      console.error('Error in GET /api/matches/sync fetching matches post-sync:', updatedMatchesError);
      return NextResponse.json(
        { error: 'Failed to fetch updated matches post-sync' },
        { status: 500 }
      );
    }

    for (const updatedMatch of (updatedMatches || [])) {
      const originalMatch = activeMatchesList.find(m => m.id === updatedMatch.id);
      if (originalMatch && originalMatch.status !== 'finished' && updatedMatch.status === 'finished') {
        console.log(`Match ${updatedMatch.id} transitioned to finished. Calling compute_points RPC...`);
        const { error: computePointsError } = await supabase.rpc('compute_points', {
          p_match_id: updatedMatch.id
        });
        if (computePointsError) {
          console.error(`Error computing points for match ${updatedMatch.id}:`, computePointsError);
        }
      }
    }

    return NextResponse.json(
      { activeMatchesCount, synced: true },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Unhandled error in GET /api/matches/sync:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', details: err.message },
      { status: 500 }
    );
  }
}
