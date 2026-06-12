console.log('--- process.env keys and values ---');
for (const key of Object.keys(process.env)) {
  if (key.startsWith('PG') || key.startsWith('DATABASE') || key.startsWith('USER')) {
    console.log(`${key}: ${process.env[key]}`);
  }
}
