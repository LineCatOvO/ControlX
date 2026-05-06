import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import net from "net";
import config from "./config";

class BackendManager {
    private backendProcess: ChildProcess | null = null;
    private backendPort: number | null = null;

    async findAvailablePort(startPort: number = 10000, endPort: number = 60000): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(0, () => {
                const address = server.address();
                if (address && typeof address === 'object' && 'port' in address) {
                    const port = address.port;
                    server.close(() => resolve(port));
                } else {
                    reject(new Error("Failed to get server address"));
                }
            });
            server.on('error', reject);
        });
    }

    async start(): Promise<number> {
        console.log("🚀 Starting backend server...");
        
        try {
            this.backendPort = await this.findAvailablePort();
            console.log(`📡 Found available port: ${this.backendPort}`);
            
            const serverPath = config.backend.serverPath;
            
            if (!fs.existsSync(serverPath)) {
                throw new Error(`Server file not found at ${serverPath}`);
            }
            
            this.backendProcess = spawn("node", [serverPath], {
                cwd: config.backend.serverCwd,
                env: {
                    ...process.env,
                    TEST_MODE: "true",
                    DISABLE_ACTUAL_INPUT: "true",
                    PORT: this.backendPort.toString(),
                    NODE_ENV: "test"
                },
                stdio: ["pipe", "pipe", "pipe"]
            });
            
            this.backendProcess.stdout?.on('data', (data) => {
                const output = data.toString().trim();
                if (!output.includes('[TEST_KEYBOARD] applyState:') && !output.includes('"state": []')) {
                    console.log(`[Backend] ${output}`);
                }
            });
            
            this.backendProcess.stderr?.on('data', (data) => {
                console.error(`[Backend Error] ${data.toString().trim()}`);
            });
            
            this.backendProcess.on('error', (error) => {
                console.error(`[Backend] Process error: ${error.message}`);
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log(`✅ Backend started successfully on port ${this.backendPort}`);
            return this.backendPort;
        } catch (error) {
            console.error(`❌ Failed to start backend: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    stop(): void {
        console.log("🛑 Stopping backend server...");
        
        if (this.backendProcess) {
            this.backendProcess.kill("SIGTERM");
            this.backendProcess = null;
            this.backendPort = null;
            console.log("✅ Backend stopped");
        }
    }

    getPort(): number | null {
        return this.backendPort;
    }
}

export default BackendManager;