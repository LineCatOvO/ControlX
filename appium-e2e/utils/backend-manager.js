const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");

class BackendManager {
    constructor() {
        this.backendProcess = null;
        this.backendPort = null;
    }

    async findAvailablePort(startPort = 10000, endPort = 60000) {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(0, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            server.on('error', reject);
        });
    }

    async start() {
        console.log("🚀 Starting backend server...");
        
        try {
            this.backendPort = await this.findAvailablePort();
            console.log(`📡 Found available port: ${this.backendPort}`);
            
            const serverPath = path.join(__dirname, "..", "..", "Server", "dist", "app.js");
            
            if (!fs.existsSync(serverPath)) {
                throw new Error(`Server file not found at ${serverPath}`);
            }
            
            this.backendProcess = spawn("node", [serverPath], {
                cwd: path.join(__dirname, "..", "..", "Server"),
                env: {
                    ...process.env,
                    TEST_MODE: "true",
                    DISABLE_ACTUAL_INPUT: "true",
                    PORT: this.backendPort.toString(),
                    NODE_ENV: "test"
                },
                stdio: ["pipe", "pipe", "pipe"]
            });
            
            this.backendProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (!output.includes('[TEST_KEYBOARD] applyState:') && !output.includes('"state": []')) {
                    console.log(`[Backend] ${output}`);
                }
            });
            
            this.backendProcess.stderr.on('data', (data) => {
                console.error(`[Backend Error] ${data.toString().trim()}`);
            });
            
            this.backendProcess.on('error', (error) => {
                console.error(`[Backend] Process error: ${error.message}`);
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log(`✅ Backend started successfully on port ${this.backendPort}`);
            return this.backendPort;
        } catch (error) {
            console.error(`❌ Failed to start backend: ${error.message}`);
            throw error;
        }
    }

    stop() {
        console.log("🛑 Stopping backend server...");
        
        if (this.backendProcess) {
            this.backendProcess.kill("SIGTERM");
            this.backendProcess = null;
            this.backendPort = null;
            console.log("✅ Backend stopped");
        }
    }

    getPort() {
        return this.backendPort;
    }
}

module.exports = BackendManager;
