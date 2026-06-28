async function run() {
  try {
    console.log('Fetching games from worldcup26.ir...');
    const res = await fetch('https://worldcup26.ir/get/games');
    if (!res.ok) {
      console.error('Failed to fetch:', res.status);
      return;
    }
    const data = await res.json();
    const games = data.games || [];
    console.log(`Total games: ${games.length}`);
    const targetGames = games.filter((g: any) => g.id === '81' || g.id === '82');
    console.log(JSON.stringify(targetGames, null, 2));
  } catch (err: any) {
    console.error(err);
  }
}

run();
