import dns from 'dns';

const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = function (hostname: string, options: any, callback: any) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }

  console.log(`dns.lookup called for: ${hostname}, opts: ${JSON.stringify(opts)}`);

  if (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co')) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err) {
        console.log(`resolver.resolve4 error for ${hostname}:`, err.message);
        originalLookup(hostname, opts, cb);
      } else {
        console.log(`resolver.resolve4 success for ${hostname}:`, addresses);
        if (addresses && addresses.length > 0) {
          cb(null, addresses[0], 4);
        } else {
          originalLookup(hostname, opts, cb);
        }
      }
    });
  } else {
    originalLookup(hostname, opts, cb);
  }
};

dns.lookup('aws-0-us-east-2.pooler.supabase.com', (err, address, family) => {
  console.log('Lookup result:', err ? err.message : `${address} (family: ${family})`);
});
