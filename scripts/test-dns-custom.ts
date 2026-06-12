import { Resolver } from 'dns';

const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);

const hosts = [
  'db.eidfwvezvzpvcgqnijhm.pooler.supabase.com',
  'eidfwvezvzpvcgqnijhm.pooler.supabase.com',
  'db.eidfwvezvzpvcgqnijhm.supabase.co'
];

hosts.forEach(host => {
  resolver.resolve4(host, (err, addresses) => {
    if (err) {
      console.error(`Error for ${host}:`, err.message);
    } else {
      console.log(`Addresses for ${host}:`, addresses);
    }
  });
});


