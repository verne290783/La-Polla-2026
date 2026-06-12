import dns from 'dns';

const prefixes = [
  'aws-0',
  'aws-1',
  'aws-2',
  'aws-3',
  'gcp-0',
  'gcp-1',
  'fly-0',
  'fly-1'
];

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-1',
  'ap-northeast-1'
];

function checkDns(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    dns.lookup(host, (err, address) => {
      if (err) {
        resolve(false);
      } else {
        console.log(`RESOLVED: ${host} -> ${address}`);
        resolve(true);
      }
    });
  });
}

async function run() {
  console.log('Testing pooler host prefixes...');
  for (const prefix of prefixes) {
    for (const region of regions) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      await checkDns(host);
    }
  }
  console.log('Done.');
}

run();
