const { spawn } = require('child_process');
const path = require('path');

console.log('Testing backend server startup...');

const serverPath = path.join(__dirname, 'Server', 'dist', 'app.js');

const backendProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, 'Server'),
    env: {
        ...process.env,
        TEST_MODE: 'true',
        DISABLE_ACTUAL_INPUT: 'true',
        PORT: '3002',
        NODE_ENV: 'test'
    },
    stdio: ['pipe', 'pipe', 'pipe']
});

backendProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`[Backend Output] ${output}`);
});

backendProcess.stderr.on('data', (data) => {
    const errorOutput = data.toString().trim();
    console.error(`[Backend Error] ${errorOutput}`);
});

backendProcess.on('error', (error) => {
    console.error(`[Process Error] ${error.message}`);
});

backendProcess.on('close', (code) => {
    console.log(`[Process Exit] Code: ${code}`);
});

// Wait for a few seconds then stop
setTimeout(() => {
    console.log('Stopping backend process...');
    backendProcess.kill('SIGTERM');
}, 5000);
