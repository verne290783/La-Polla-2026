import { Resolver } from 'dns';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

resolver.resolve6('db.eidfwvezvzpvcgqnijhm.supabase.co', (err, addresses) => {
  if (err) {
    console.error('IPv6 Error with custom resolver:', err.message);
  } else {
    console.log('IPv6 Addresses with custom resolver:', addresses);
  }
});
