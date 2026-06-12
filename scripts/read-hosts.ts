import fs from 'fs';

try {
  const content = fs.readFileSync('C:\\Windows\\System32\\drivers\\etc\\hosts', 'utf8');
  console.log('Hosts file content:');
  console.log(content);
} catch (err: any) {
  console.error('Error reading hosts file:', err.message);
}
