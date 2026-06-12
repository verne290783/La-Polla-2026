import { Resolver } from 'dns';

const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1'
];

regions.forEach(region => {
  const host = `aws-0-${region}.pooler.supabase.com`;
  resolver.resolve4(host, (err, addresses) => {
    if (!err) {
      console.log(`${host} IPv4 addresses:`, addresses);
    }
  });
});
