async function run() {
  try {
    const res = await fetch('https://worldcup26.ir/get/games');
    const data = await res.json();
    const games = data.games || [];
    const knockouts = games.filter((g: any) => g.type !== 'group');
    console.log('ID | Home Team Name | Away Team Name | Home Label | Away Label');
    console.log('--------------------------------------------------------------');
    knockouts.forEach((g: any) => {
      console.log(`${g.id} | ${g.home_team_name_en || 'N/A'} | ${g.away_team_name_en || 'N/A'} | ${g.home_team_label || 'N/A'} | ${g.away_team_label || 'N/A'}`);
    });
  } catch (err) {
    console.error(err);
  }
}

run();
