import { Resolver } from 'dns';

const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);

resolver.resolve4('aws-0-us-east-1.pooler.supabase.co', (err, addresses) => {
  if (err) {
    console.error('Error resolving .co:', err.message);
  } else {
    console.log('Resolved .co:', addresses);
  }
});
