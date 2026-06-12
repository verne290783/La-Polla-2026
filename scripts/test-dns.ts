import dns from 'dns';

dns.lookup('db.eidfwvezvzpvcgqnijhm.supabase.co', (err, address, family) => {
  console.log('db.eidfwvezvzpvcgqnijhm.supabase.co:', err ? err.message : address);
});

dns.lookup('eidfwvezvzpvcgqnijhm.supabase.co', (err, address, family) => {
  console.log('eidfwvezvzpvcgqnijhm.supabase.co:', err ? err.message : address);
});
