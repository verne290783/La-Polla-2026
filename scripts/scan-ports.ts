import net from 'net';

const ports = [5432, 5433, 6543, 54321, 54322, 54323];

function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}

async function run() {
  console.log('Scanning common ports on localhost...');
  for (const port of ports) {
    const open = await checkPort(port);
    console.log(`Port ${port}: ${open ? 'OPEN' : 'CLOSED'}`);
  }
}

run();
