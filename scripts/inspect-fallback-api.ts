async function run() {
  console.log('Fetching games from worldcup26.ir...');
  try {
    const res = await fetch('https://worldcup26.ir/get/games');
    if (!res.ok) {
      console.error('API Error:', res.status);
      return;
    }
    const data = await res.json();
    const games = data.games || [];
    console.log(`Total games from fallback API: ${games.length}`);
    
    const knockouts = games.filter((g: any) => g.type !== 'group');
    console.log('\nKnockout matches from fallback API (Sample of first 10):');
    console.log(JSON.stringify(knockouts.slice(0, 10), null, 2));
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}
run();
