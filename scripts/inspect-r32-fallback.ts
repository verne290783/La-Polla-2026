async function run() {
  try {
    const res = await fetch('https://worldcup26.ir/get/games');
    if (!res.ok) {
      console.error('API Error:', res.status);
      return;
    }
    const data = await res.json();
    const games = data.games || [];
    
    console.log('R32 Matches with resolved teams from worldcup26.ir:');
    games.forEach((g: any) => {
      if (g.type === 'r32' && (g.home_team_name_en || g.away_team_name_en)) {
        console.log(`Match ${g.id}: ${g.home_team_name_en || 'TBD'} vs ${g.away_team_name_en || 'TBD'} (Label: ${g.home_team_label} vs ${g.away_team_label})`);
      }
    });
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
run();
