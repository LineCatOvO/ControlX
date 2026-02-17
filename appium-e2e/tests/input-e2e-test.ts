import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import WebSocket from "ws";

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: any;
}

interface TestReport {
    timestamp: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
    results: TestResult[];
}

class InputTestRunner {
    private backendPort: number | null = null;
    private backendProcess: any = null;
    private wsClient: WebSocket | null = null;
    private testResults: TestResult[] = [];
    private startTime: number = 0;

    async findAvailablePort(): Promise<number> {
        const net = require("net");
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(0, () => {
                const address = server.address();
                if (address && typeof address === "object" && "port" in address) {
                    const port = address.port;
                    server.close(() => resolve(port));
                } else {
                    reject(new Error("Failed to get server address"));
                }
            });
            server.on("error", reject);
        });
    }

    async startBackend(): Promise<void> {
        console.log("\n🚀 Starting Backend Server");
        console.log("=".repeat(60));

        this.backendPort = await this.findAvailablePort();
        console.log(`📡 Found available port: ${this.backendPort}`);

        const serverPath = path.join(__dirname, "..", "..", "..", "Server", "dist", "app.js");
        const serverCwd = path.join(__dirname, "..", "..", "..", "Server");

        if (!fs.existsSync(serverPath)) {
            throw new Error(`Server file not found at ${serverPath}`);
        }

        const { spawn } = require("child_process");
        this.backendProcess = spawn("node", [serverPath], {
            cwd: serverCwd,
            env: {
                ...process.env,
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                PORT: this.backendPort.toString(),
                NODE_ENV: "test"
            },
            stdio: ["pipe", "pipe", "pipe"]
        });

        this.backendProcess.stdout?.on("data", (data: Buffer) => {
            const output = data.toString().trim();
            if (!output.includes("[TEST_KEYBOARD] applyState:") && !output.includes('"state": []')) {
                console.log(`[Backend] ${output}`);
            }
        });

        this.backendProcess.stderr?.on("data", (data: Buffer) => {
            console.error(`[Backend Error] ${data.toString().trim()}`);
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`✅ Backend started successfully on port ${this.backendPort}`);
    }

    async connectWebSocket(): Promise<void> {
        console.log("\n🔌 Connecting to WebSocket Server");
        console.log("=".repeat(60));

        if (!this.backendPort) {
            throw new Error("Backend port not available");
        }

        const wsUrl = `ws://localhost:${this.backendPort}`;
        console.log(`Connecting to: ${wsUrl}`);

        return new Promise((resolve, reject) => {
            this.wsClient = new WebSocket(wsUrl);

            this.wsClient.on("open", () => {
                console.log("✅ WebSocket connected");
                resolve();
            });

            this.wsClient.on("error", (error) => {
                console.error(`❌ WebSocket error: ${error.message}`);
                reject(error);
            });

            setTimeout(() => {
                if (this.wsClient && this.wsClient.readyState !== WebSocket.OPEN) {
                    reject(new Error("WebSocket connection timeout"));
                }
            }, 5000);
        });
    }

    async sendMessage(message: any, expectedResponseType?: string): Promise<any> {
        if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not connected");
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Message timeout"));
            }, 5000);

            const handler = (data: Buffer) => {
                try {
                    const response = JSON.parse(data.toString());
                    
                    if (response.type === "welcome") {
                        return;
                    }
                    
                    if (message.type === "ping" && response.type === "pong") {
                        clearTimeout(timeout);
                        this.wsClient?.off("message", handler);
                        resolve(response);
                        return;
                    }
                    
                    if (message.type === "state" && response.type === "stateAck") {
                        clearTimeout(timeout);
                        this.wsClient?.off("message", handler);
                        resolve(response);
                        return;
                    }
                    
                    if (message.type === "event" && response.type === "eventAck") {
                        clearTimeout(timeout);
                        this.wsClient?.off("message", handler);
                        resolve(response);
                        return;
                    }
                    
                    if (expectedResponseType && response.type === expectedResponseType) {
                        clearTimeout(timeout);
                        this.wsClient?.off("message", handler);
                        resolve(response);
                        return;
                    }
                    
                    if (response.type !== "welcome" && response.type !== "pong") {
                        clearTimeout(timeout);
                        this.wsClient?.off("message", handler);
                        resolve(response);
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    this.wsClient?.off("message", handler);
                    reject(error);
                }
            };

            this.wsClient?.on("message", handler);
            this.wsClient?.send(JSON.stringify(message));
            console.log(`[WS Sent] ${JSON.stringify(message)}`);
        });
    }

    async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
        const startTime = Date.now();
        console.log(`\n🧪 Running test: ${name}`);
        console.log("-".repeat(40));

        try {
            await testFn();
            const duration = Date.now() - startTime;
            console.log(`✅ Test passed: ${name} (${duration}ms)`);
            return { name, passed: true, duration };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Test failed: ${name} - ${errorMessage}`);
            return { name, passed: false, duration, error: errorMessage };
        }
    }

    async testKeyboardInput(): Promise<void> {
        console.log("\n⌨️ Testing Keyboard Input");
        console.log("=".repeat(60));

        const testCases = [
            {
                name: "Single Key Press",
                message: {
                    type: "state",
                    stateId: 1,
                    clientSendTs: Date.now(),
                    keyboardState: ["a"],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Multiple Keys Press",
                message: {
                    type: "state",
                    stateId: 2,
                    clientSendTs: Date.now(),
                    keyboardState: ["w", "a", "s", "d"],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Modifier Keys",
                message: {
                    type: "state",
                    stateId: 3,
                    clientSendTs: Date.now(),
                    keyboardState: ["shift", "a"],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Release All Keys",
                message: {
                    type: "state",
                    stateId: 4,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            }
        ];

        for (const testCase of testCases) {
            const result = await this.runTest(`Keyboard: ${testCase.name}`, async () => {
                const response = await this.sendMessage(testCase.message);
                if (response.type !== "stateAck" && response.type !== "eventAck") {
                    throw new Error(`Unexpected response type: ${response.type}`);
                }
                console.log(`   Response: ${JSON.stringify(response)}`);
            });
            this.testResults.push(result);
        }
    }

    async testGamepadInput(): Promise<void> {
        console.log("\n🎮 Testing Gamepad Input");
        console.log("=".repeat(60));

        const testCases = [
            {
                name: "Single Button Press",
                message: {
                    type: "state",
                    stateId: 10,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: ["a"],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Multiple Buttons Press",
                message: {
                    type: "state",
                    stateId: 11,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: ["a", "b", "x", "y"],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Left Joystick Movement",
                message: {
                    type: "state",
                    stateId: 12,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0.5, y: -0.5 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Right Joystick Movement",
                message: {
                    type: "state",
                    stateId: 13,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: -0.7, y: 0.7 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            },
            {
                name: "Trigger Input",
                message: {
                    type: "state",
                    stateId: 14,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0.8, right: 0.5 }
                    },
                    flags: []
                }
            },
            {
                name: "Combined Input",
                message: {
                    type: "state",
                    stateId: 15,
                    clientSendTs: Date.now(),
                    keyboardState: ["w"],
                    gamepadState: {
                        buttons: ["a", "lb"],
                        joysticks: { left: { x: 0.3, y: -0.3 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0.6 }
                    },
                    flags: []
                }
            },
            {
                name: "Release All Buttons",
                message: {
                    type: "state",
                    stateId: 16,
                    clientSendTs: Date.now(),
                    keyboardState: [],
                    gamepadState: {
                        buttons: [],
                        joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                        triggers: { left: 0, right: 0 }
                    },
                    flags: []
                }
            }
        ];

        for (const testCase of testCases) {
            const result = await this.runTest(`Gamepad: ${testCase.name}`, async () => {
                const response = await this.sendMessage(testCase.message);
                if (response.type !== "stateAck" && response.type !== "eventAck") {
                    throw new Error(`Unexpected response type: ${response.type}`);
                }
                console.log(`   Response: ${JSON.stringify(response)}`);
            });
            this.testResults.push(result);
        }
    }

    async testInputDelta(): Promise<void> {
        console.log("\n📊 Testing Input Delta");
        console.log("=".repeat(60));

        const testCases = [
            {
                name: "Keyboard Delta Press",
                message: {
                    type: "event",
                    eventId: 1,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: {
                            pressed: ["space"],
                            released: []
                        }
                    }
                }
            },
            {
                name: "Keyboard Delta Release",
                message: {
                    type: "event",
                    eventId: 2,
                    clientSendTs: Date.now(),
                    delta: {
                        keyboard: {
                            pressed: [],
                            released: ["space"]
                        }
                    }
                }
            },
            {
                name: "Gamepad Button Delta",
                message: {
                    type: "event",
                    eventId: 3,
                    clientSendTs: Date.now(),
                    delta: {
                        gamepad: {
                            buttonsPressed: ["start"],
                            buttonsReleased: []
                        }
                    }
                }
            }
        ];

        for (const testCase of testCases) {
            const result = await this.runTest(`Delta: ${testCase.name}`, async () => {
                const response = await this.sendMessage(testCase.message);
                if (response.type !== "eventAck") {
                    throw new Error(`Unexpected response type: ${response.type}`);
                }
                console.log(`   Response: ${JSON.stringify(response)}`);
            });
            this.testResults.push(result);
        }
    }

    async testPingPong(): Promise<void> {
        console.log("\n🏓 Testing Ping/Pong");
        console.log("=".repeat(60));

        const result = await this.runTest("Ping/Pong Communication", async () => {
            const response = await this.sendMessage({ type: "ping" }, "pong");
            if (response.type !== "pong") {
                throw new Error(`Expected pong, got ${response.type}`);
            }
            console.log(`   Response: ${JSON.stringify(response)}`);
        });
        this.testResults.push(result);
    }

    generateReport(): TestReport {
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = this.testResults.filter(r => !r.passed).length;
        const duration = Date.now() - this.startTime;

        return {
            timestamp: new Date().toISOString(),
            totalTests: this.testResults.length,
            passedTests,
            failedTests,
            duration,
            results: this.testResults
        };
    }

    printReport(): void {
        const report = this.generateReport();

        console.log("\n" + "=".repeat(60));
        console.log("📊 INPUT TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Timestamp: ${report.timestamp}`);
        console.log(`Total Tests: ${report.totalTests}`);
        console.log(`Passed: ${report.passedTests}`);
        console.log(`Failed: ${report.failedTests}`);
        console.log(`Duration: ${report.duration}ms`);
        console.log("=".repeat(60));

        console.log("\n📋 Test Results:");
        for (const result of report.results) {
            const status = result.passed ? "✅ PASS" : "❌ FAIL";
            console.log(`  ${status} - ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`         Error: ${result.error}`);
            }
        }

        console.log("\n" + "=".repeat(60));
        const passRate = ((report.passedTests / report.totalTests) * 100).toFixed(1);
        console.log(`Pass Rate: ${passRate}%`);
        console.log("=".repeat(60));
    }

    cleanup(): void {
        console.log("\n🧹 Cleaning up...");

        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
            console.log("✅ WebSocket disconnected");
        }

        if (this.backendProcess) {
            this.backendProcess.kill("SIGTERM");
            this.backendProcess = null;
            console.log("✅ Backend stopped");
        }
    }

    async runAllTests(): Promise<boolean> {
        this.startTime = Date.now();
        let success = false;

        try {
            console.log("🧪 Starting Input E2E Test");
            console.log("=".repeat(60));

            await this.startBackend();
            await this.connectWebSocket();

            await this.testPingPong();
            await this.testKeyboardInput();
            await this.testGamepadInput();
            await this.testInputDelta();

            success = true;
        } catch (error) {
            console.error("\n❌ TEST EXECUTION FAILED");
            console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            success = false;
        } finally {
            this.cleanup();
            this.printReport();
        }

        return success;
    }
}

async function main(): Promise<void> {
    const runner = new InputTestRunner();

    try {
        const success = await runner.runAllTests();
        console.log(`\n🏁 Input E2E test finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Test execution crashed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { InputTestRunner, TestResult, TestReport };
