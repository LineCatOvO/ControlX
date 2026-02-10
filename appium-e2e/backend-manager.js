const { spawn } = require("child_process");
const fs = require("fs");
const config = require("./config");

let backendProcess = null;
let backendPort = null;

async function startBackend() {
    console.log("🚀 Starting backend server...");
    
    try {
        const portManager = require("./port-manager");
        backendPort = await portManager.findAvailablePort();
        console.log(`📡 Found available port: ${backendPort}`);
        
        const serverPath = config.backend.serverPath;
        
        if (!fs.existsSync(serverPath)) {
            throw new Error(`Server file not found at ${serverPath}`);
        }
        
        backendProcess = spawn("node", [serverPath], {
            cwd: config.backend.serverCwd,
            env: {
                ...process.env,
                ...config.backend.env,
                PORT: backendPort.toString()
            },
            stdio: ["pipe", "pipe", "pipe"]
        });
        
        backendProcess.stdout.on('data', (data) => {
            console.log(`[Backend] ${data.toString().trim()}`);
        });
        
        backendProcess.stderr.on('data', (data) => {
            console.error(`[Backend Error] ${data.toString().trim()}`);
        });
        
        backendProcess.on('error', (error) => {
            console.error(`[Backend] Process error: ${error.message}`);
        });
        
        await new Promise(resolve => setTimeout(resolve, config.backend.startupTimeout));
        
        console.log(`✅ Backend started successfully on port ${backendPort}`);
        return backendPort;
    } catch (error) {
        console.error(`❌ Failed to start backend: ${error.message}`);
        throw error;
    }
}

function stopBackend() {
    console.log("🛑 Stopping backend server...");
    
    if (backendProcess) {
        backendProcess.kill("SIGTERM");
        backendProcess = null;
        backendPort = null;
        console.log("✅ Backend stopped");
    }
}

function getBackendPort() {
    return backendPort;
}

module.exports = {
    startBackend,
    stopBackend,
    getBackendPort
};
