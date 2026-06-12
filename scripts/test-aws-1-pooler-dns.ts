import { Resolver } from 'dns';

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

resolver.resolve4('aws-1-us-east-2.pooler.supabase.com', (err, addresses) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Resolved IPs for aws-1-us-east-2.pooler.supabase.com:', addresses);
  }
});
