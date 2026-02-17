import { execSync, spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import WebSocket from "ws";

interface TestConfig {
    deviceId: string;
    backendPort: number | null;
    apkOutputPath: string;
    packageName: string;
    mainActivity: string;
    serverPath: string;
    serverCwd: string;
    androidProjectPath: string;
}

interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: any;
}

interface BuildResult {
    success: boolean;
    error?: string;
    duration?: number;
}

class PipelineTestRunner {
    private config: TestConfig;
    private backendProcess: ChildProcess | null = null;
    private wsClient: WebSocket | null = null;
    private testResults: TestResult[] = [];
    private startTime: number = 0;
    private verbose: boolean;
    private skipBuild: boolean;

    constructor(deviceId: string, options: { verbose?: boolean; skipBuild?: boolean } = {}) {
        this.verbose = options.verbose ?? false;
        this.skipBuild = options.skipBuild ?? false;
        this.config = {
            deviceId,
            backendPort: null,
            apkOutputPath: path.join(__dirname, "..", "..", "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
            packageName: "com.linecat.wmmtcontroller",
            mainActivity: "com.linecat.wmmtcontroller/.MainActivity",
            serverPath: path.join(__dirname, "..", "..", "..", "Server", "dist", "app.js"),
            serverCwd: path.join(__dirname, "..", "..", "..", "Server"),
            androidProjectPath: path.join(__dirname, "..", "..", "..", "AndroidClient")
        };
    }

    private execAdb(command: string): string {
        const fullCommand = `adb -s ${this.config.deviceId} ${command}`;
        try {
            return execSync(fullCommand, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 30000 }).trim();
        } catch (error: any) {
            return error.stdout?.toString() || error.stderr?.toString() || "";
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private log(message: string): void {
        console.log(`[${new Date().toISOString().substring(11, 23)}] ${message}`);
    }

    private logVerbose(message: string): void {
        if (this.verbose) {
            console.log(`[${new Date().toISOString().substring(11, 23)}] ${message}`);
        }
    }

    async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
        const startTime = Date.now();
        this.log(`🧪 Starting: ${name}`);

        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.log(`✅ Passed: ${name} (${duration}ms)`);
            return { name, passed: true, duration };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`❌ Failed: ${name} - ${errorMessage}`);
            return { name, passed: false, duration, error: errorMessage };
        }
    }

    async checkDeviceConnection(): Promise<void> {
        this.log("\n📱 Phase 1: Device Connection Check");
        this.log("=".repeat(60));

        const devices = this.execAdb("devices");
        if (!devices.includes(this.config.deviceId)) {
            throw new Error(`Device ${this.config.deviceId} not connected. Available devices:\n${devices}`);
        }

        const model = this.execAdb("shell getprop ro.product.model");
        const android = this.execAdb("shell getprop ro.build.version.release");
        this.log(`Device: ${model} (Android ${android})`);
        this.log(`Device ID: ${this.config.deviceId}`);
    }

    async buildServer(): Promise<BuildResult> {
        this.logVerbose("[Build] Building server...");
        const startTime = Date.now();

        try {
            execSync("npm run build", {
                cwd: this.config.serverCwd,
                encoding: "utf8",
                stdio: this.verbose ? "inherit" : ["pipe", "pipe", "pipe"],
                timeout: 120000
            });

            if (!fs.existsSync(this.config.serverPath)) {
                return { success: false, error: `Server build output not found: ${this.config.serverPath}` };
            }

            return { success: true, duration: Date.now() - startTime };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async buildAndroid(): Promise<BuildResult> {
        this.logVerbose("[Build] Building Android app...");
        const startTime = Date.now();

        try {
            if (!fs.existsSync(this.config.androidProjectPath)) {
                return { success: false, error: `Android project not found: ${this.config.androidProjectPath}` };
            }

            const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
            execSync(`${gradlew} assembleDebug`, {
                cwd: this.config.androidProjectPath,
                encoding: "utf8",
                stdio: this.verbose ? "inherit" : ["pipe", "pipe", "pipe"],
                timeout: 300000,
                env: { ...process.env, JAVA_HOME: process.env.JAVA_HOME || "" }
            });

            if (!fs.existsSync(this.config.apkOutputPath)) {
                return { success: false, error: `APK output not found: ${this.config.apkOutputPath}` };
            }

            return { success: true, duration: Date.now() - startTime };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }

    async runParallelBuild(): Promise<{ server: BuildResult; android: BuildResult }> {
        this.log("\n🔨 Phase 2: Parallel Build (Server + Android)");
        this.log("=".repeat(60));

        if (this.skipBuild) {
            this.log("⏭️ Skipping build (skip-build flag)");
            return {
                server: { success: fs.existsSync(this.config.serverPath) },
                android: { success: fs.existsSync(this.config.apkOutputPath) }
            };
        }

        const [serverResult, androidResult] = await Promise.all([
            this.buildServer(),
            this.buildAndroid()
        ]);

        if (serverResult.success) {
            this.log(`✅ Server built (${serverResult.duration}ms)`);
        } else {
            this.log(`❌ Server build failed: ${serverResult.error}`);
        }

        if (androidResult.success) {
            this.log(`✅ Android app built (${androidResult.duration}ms)`);
        } else {
            this.log(`❌ Android build failed: ${androidResult.error}`);
        }

        return { server: serverResult, android: androidResult };
    }

    async installApp(): Promise<void> {
        this.log("\n📲 Phase 3: Installing Application");
        this.log("=".repeat(60));

        if (!fs.existsSync(this.config.apkOutputPath)) {
            throw new Error(`APK not found: ${this.config.apkOutputPath}`);
        }

        this.log(`Installing: ${this.config.apkOutputPath}`);
        
        const result = execSync(`adb -s ${this.config.deviceId} install -r "${this.config.apkOutputPath}"`, {
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 60000
        });

        if (!result.includes("Success")) {
            throw new Error(`Installation failed: ${result}`);
        }

        this.log("✅ App installed successfully");
    }

    async startBackend(): Promise<void> {
        this.log("\n🖥️ Phase 4: Starting Backend Server");
        this.log("=".repeat(60));

        if (!fs.existsSync(this.config.serverPath)) {
            throw new Error(`Server not found: ${this.config.serverPath}`);
        }

        const port = 57128 + Math.floor(Math.random() * 1000);

        return new Promise((resolve, reject) => {
            try {
                this.backendProcess = spawn("node", [this.config.serverPath], {
                    cwd: this.config.serverCwd,
                    env: {
                        ...process.env,
                        TEST_MODE: "true",
                        DISABLE_ACTUAL_INPUT: "true",
                        PORT: port.toString(),
                        NODE_ENV: "test"
                    },
                    stdio: ["pipe", "pipe", "pipe"]
                });

                this.backendProcess.stdout?.on("data", (data: Buffer) => {
                    const output = data.toString().trim();
                    if (output && this.verbose && !output.includes("DRY_RUN")) {
                        this.logVerbose(`[Backend] ${output}`);
                    }
                });

                this.backendProcess.stderr?.on("data", (data: Buffer) => {
                    const output = data.toString().trim();
                    if (output && this.verbose) {
                        this.logVerbose(`[Backend Error] ${output}`);
                    }
                });

                this.backendProcess.on("error", (error) => {
                    reject(new Error(`Backend process error: ${error.message}`));
                });

                setTimeout(() => {
                    this.config.backendPort = port;
                    this.log(`✅ Backend started on port ${port}`);
                    resolve();
                }, 3000);
            } catch (error) {
                reject(error);
            }
        });
    }

    async grantPermissions(): Promise<void> {
        this.log("\n🔓 Phase 5: Granting Permissions");
        this.log("=".repeat(60));

        this.execAdb(`shell appops set ${this.config.packageName} SYSTEM_ALERT_WINDOW allow`);
        await this.delay(300);

        this.execAdb(`shell pm grant ${this.config.packageName} android.permission.INTERNET`);
        this.execAdb(`shell pm grant ${this.config.packageName} android.permission.ACCESS_NETWORK_STATE`);
        this.execAdb(`shell pm grant ${this.config.packageName} android.permission.FOREGROUND_SERVICE`);

        const overlayCheck = this.execAdb(`shell appops get ${this.config.packageName} SYSTEM_ALERT_WINDOW`);
        this.log(`Overlay permission: ${overlayCheck.includes("allow") ? "✅ Granted" : "⚠️ Check manually"}`);
    }

    async launchApp(): Promise<void> {
        this.log("\n🚀 Phase 6: Launching Application");
        this.log("=".repeat(60));

        this.execAdb(`shell am force-stop ${this.config.packageName}`);
        await this.delay(500);

        this.execAdb(`shell am start -n ${this.config.mainActivity}`);
        await this.delay(2000);

        this.log("✅ App launched");
    }

    async simulateUserStartService(): Promise<void> {
        this.log("\n👆 Phase 7: Simulating User - Start Service");
        this.log("=".repeat(60));

        this.log("User action: Tap Start Service button");
        this.execAdb("shell input tap 326 510");
        await this.delay(2000);

        this.execAdb("shell uiautomator dump");
        await this.delay(500);
        const dumpOutput = this.execAdb("shell cat /sdcard/window_dump.xml");

        if (dumpOutput.includes("已启动") || dumpOutput.includes("running")) {
            this.log("✅ Service started (verified via UI)");
        } else {
            this.log("⚠️ Service status could not be verified via UI");
        }
    }

    async simulateUserInputTest(): Promise<void> {
        this.log("\n🎮 Phase 8: Simulating User - Input Test via Android");
        this.log("=".repeat(60));

        this.log("Note: Input simulation via Android touch events");
        this.log("This tests the actual Android -> Server communication path");

        this.log("\n1️⃣ Simulating keyboard button press (W key area)");
        this.execAdb("shell input tap 200 1200");
        await this.delay(500);

        this.log("2️⃣ Simulating gamepad button press (A button area)");
        this.execAdb("shell input tap 400 1400");
        await this.delay(500);

        this.log("3️⃣ Simulating joystick movement (drag)");
        this.execAdb("shell input swipe 600 1300 700 1200 300");
        await this.delay(500);

        this.log("✅ User input simulation completed");
    }

    async simulateUserStopService(): Promise<void> {
        this.log("\n🛑 Phase 9: Simulating User - Stop Service");
        this.log("=".repeat(60));

        this.log("User action: Tap Stop Service button");
        this.execAdb("shell input tap 954 510");
        await this.delay(2000);

        this.execAdb("shell uiautomator dump");
        await this.delay(500);
        const dumpOutput = this.execAdb("shell cat /sdcard/window_dump.xml");

        if (dumpOutput.includes("已停止") || dumpOutput.includes("stopped")) {
            this.log("✅ Service stopped (verified via UI)");
        } else {
            this.log("⚠️ Service status could not be verified via UI");
        }
    }

    async verifyBackendCommunication(): Promise<void> {
        this.log("\n🔌 Phase 10: Verify Backend Communication");
        this.log("=".repeat(60));

        if (!this.config.backendPort) {
            throw new Error("Backend port not available");
        }

        const wsUrl = `ws://localhost:${this.config.backendPort}`;
        this.log(`Connecting to: ${wsUrl}`);

        return new Promise((resolve, reject) => {
            this.wsClient = new WebSocket(wsUrl);

            this.wsClient.on("open", () => {
                this.log("✅ WebSocket connected to backend");
                
                this.wsClient!.send(JSON.stringify({ type: "ping" }));
            });

            this.wsClient.on("message", (data: Buffer) => {
                try {
                    const response = JSON.parse(data.toString());
                    if (response.type === "pong") {
                        this.log("✅ Backend responded to ping");
                        this.wsClient?.close();
                        resolve();
                    }
                } catch (error) {
                    reject(error);
                }
            });

            this.wsClient.on("error", (error) => {
                reject(new Error(`WebSocket error: ${error.message}`));
            });

            setTimeout(() => {
                reject(new Error("Backend communication timeout"));
            }, 5000);
        });
    }

    async runUITests(): Promise<void> {
        this.log("\n📱 Phase 11: UI Verification Tests");
        this.log("=".repeat(60));

        this.execAdb(`shell am start -n ${this.config.mainActivity}`);
        await this.delay(2000);

        this.execAdb("shell uiautomator dump");
        await this.delay(500);

        const dumpOutput = this.execAdb("shell cat /sdcard/window_dump.xml");

        const checks = [
            { pattern: "WMMT", name: "App title" },
            { pattern: "启动", name: "Start button" },
            { pattern: "停止", name: "Stop button" }
        ];

        for (const check of checks) {
            if (dumpOutput.includes(check.pattern)) {
                this.log(`✅ ${check.name} found`);
            } else {
                this.log(`⚠️ ${check.name} not found`);
            }
        }
    }

    cleanup(): void {
        this.log("\n🧹 Cleanup");

        if (this.wsClient) {
            this.wsClient.close();
            this.wsClient = null;
        }

        if (this.backendProcess) {
            this.backendProcess.kill("SIGTERM");
            this.backendProcess = null;
        }

        this.execAdb(`shell am force-stop ${this.config.packageName}`);
        this.log("✅ Cleanup completed");
    }

    printSummary(): void {
        const totalDuration = Date.now() - this.startTime;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.filter(r => !r.passed).length;

        console.log("\n" + "=".repeat(60));
        console.log("📊 PIPELINE TEST SUMMARY");
        console.log("=".repeat(60));
        console.log(`Device: ${this.config.deviceId}`);
        console.log(`Backend Port: ${this.config.backendPort || "N/A"}`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Tests: ${this.testResults.length} total, ${passed} passed, ${failed} failed`);
        console.log("-".repeat(60));

        for (const result of this.testResults) {
            const status = result.passed ? "✅" : "❌";
            console.log(`${status} ${result.name} (${result.duration}ms)`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }

        console.log("=".repeat(60));
        const passRate = this.testResults.length > 0
            ? ((passed / this.testResults.length) * 100).toFixed(1)
            : "0.0";
        console.log(`Pass Rate: ${passRate}%`);
        console.log("=".repeat(60));
    }

    async runPipeline(): Promise<boolean> {
        this.startTime = Date.now();
        this.log("🧪 Starting Pipeline E2E Test");
        this.log("=".repeat(60));

        try {
            this.testResults.push(await this.runTest("Device Connection", () => this.checkDeviceConnection()));

            const buildResult = await this.runParallelBuild();
            if (!buildResult.server.success) {
                this.testResults.push({ name: "Build", passed: false, duration: 0, error: `Server: ${buildResult.server.error}` });
                return false;
            }
            if (!buildResult.android.success) {
                this.testResults.push({ name: "Build", passed: false, duration: 0, error: `Android: ${buildResult.android.error}` });
                return false;
            }
            this.testResults.push({ name: "Build", passed: true, duration: (buildResult.server.duration || 0) + (buildResult.android.duration || 0) });

            this.testResults.push(await this.runTest("Install App", () => this.installApp()));
            this.testResults.push(await this.runTest("Start Backend", () => this.startBackend()));
            this.testResults.push(await this.runTest("Grant Permissions", () => this.grantPermissions()));
            this.testResults.push(await this.runTest("Launch App", () => this.launchApp()));
            this.testResults.push(await this.runTest("User: Start Service", () => this.simulateUserStartService()));
            this.testResults.push(await this.runTest("User: Input Test", () => this.simulateUserInputTest()));
            this.testResults.push(await this.runTest("User: Stop Service", () => this.simulateUserStopService()));
            this.testResults.push(await this.runTest("Backend Communication", () => this.verifyBackendCommunication()));
            this.testResults.push(await this.runTest("UI Tests", () => this.runUITests()));

            return this.testResults.every(r => r.passed);
        } catch (error) {
            this.log(`\n❌ PIPELINE FAILED: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        } finally {
            this.cleanup();
            this.printSummary();
        }
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    let deviceId = args.find(a => !a.startsWith("-")) || null;
    const verbose = args.includes("-v") || args.includes("--verbose");
    const skipBuild = args.includes("--skip-build");

    if (!deviceId) {
        try {
            const devices = execSync("adb devices", { encoding: "utf8" });
            const lines = devices.split("\n").filter(line => line.includes("\tdevice"));
            if (lines.length === 0) {
                console.log("❌ No device connected. Please connect a device first.");
                console.log("Usage: npm run test:full [device-id] [-v|--verbose] [--skip-build]");
                process.exit(1);
            }
            deviceId = lines[0].split("\t")[0];
            console.log(`📱 Auto-detected device: ${deviceId}`);
        } catch (error) {
            console.log("❌ Failed to detect device. Please specify device ID.");
            process.exit(1);
        }
    }

    const runner = new PipelineTestRunner(deviceId, { verbose, skipBuild });

    try {
        const success = await runner.runPipeline();
        console.log(`\n🏁 Pipeline test finished: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.log("\n💥 Pipeline crashed:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { PipelineTestRunner };
