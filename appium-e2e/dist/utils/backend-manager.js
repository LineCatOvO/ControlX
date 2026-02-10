"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
class BackendManager {
    constructor() {
        this.backendProcess = null;
        this.backendPort = null;
    }
    async findAvailablePort(startPort = 10000, endPort = 60000) {
        return new Promise((resolve, reject) => {
            const server = net_1.default.createServer();
            server.listen(0, () => {
                const address = server.address();
                if (address && typeof address === 'object' && 'port' in address) {
                    const port = address.port;
                    server.close(() => resolve(port));
                }
                else {
                    reject(new Error("Failed to get server address"));
                }
            });
            server.on('error', reject);
        });
    }
    async start() {
        console.log("🚀 Starting backend server...");
        try {
            this.backendPort = await this.findAvailablePort();
            console.log(`📡 Found available port: ${this.backendPort}`);
            const serverPath = path_1.default.join(__dirname, "..", "..", "..", "Server", "dist", "app.js");
            if (!fs_1.default.existsSync(serverPath)) {
                throw new Error(`Server file not found at ${serverPath}`);
            }
            this.backendProcess = (0, child_process_1.spawn)("node", [serverPath], {
                cwd: path_1.default.join(__dirname, "..", "..", "..", "Server"),
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
        }
        catch (error) {
            console.error(`❌ Failed to start backend: ${error instanceof Error ? error.message : String(error)}`);
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
exports.default = BackendManager;
