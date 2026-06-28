console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***** (length ' + process.env.PGPASSWORD.length + ')' : 'undefined');
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGHOST:', process.env.PGHOST);
console.log('PGPORT:', process.env.PGPORT);
