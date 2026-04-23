const { spawn } = require('child_process');
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.once('error', () => resolve(false));
    client.once('connect', () => { client.destroy(); resolve(true); });
    client.connect(port, '127.0.0.1');
  });
}

async function startTunnel() {
  console.log('========================================');
  console.log('   Pizza Paradise - Public Link');
  console.log('========================================');
  console.log();

  const port = 3000;
  const isRunning = await checkPort(port);

  if (!isRunning) {
    console.log('Starting server...');
    spawn('cmd', ['/c', 'node src\\index.js'], {
      cwd: __dirname,
      detached: true,
      stdio: 'ignore',
      shell: true
    });
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('Creating public link via localtunnel...');
  console.log();
  console.log('Please note:');
  console.log('1. You may need to click "Click to Continue" on localtunnel website');
  console.log('2. The link will show in this window');
  console.log();
  console.log('----------------------------------------');
  console.log('Starting tunnel now...');
  console.log('----------------------------------------');
  console.log();

  const lt = spawn('npx', ['localtunnel', '--port', '3000'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
}

startTunnel();