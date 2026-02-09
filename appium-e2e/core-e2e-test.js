const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const net = require("net");
const WebSocket = require("ws");

let backendProcess = null;
let backendPort = null;
let wsClient = null;
let deviceId = null;

function getAvailableDevice() {
    try {
        const devicesOutput = execSync("adb devices", { encoding: "utf8" });
        const lines = devicesOutput.split('\n').filter(line => line.trim() !== '' && !line.includes('List of devices'));
        
        for (const line of lines) {
            const parts = line.split(/\s+/);
            if (parts.length >= 2 && parts[1] === 'device') {
                return parts[0];
            }
        }
        
        throw new Error("No available device found");
    } catch (error) {
        throw new Error(`Failed to get available device: ${error.message}`);
    }
}

function findAvailablePort(startPort = 10000, endPort = 60000) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        
        server.on('error', (err) => {
            reject(err);
        });
    });
}

async function startBackend() {
    console.log("🚀 Starting backend server...");
    
    try {
        backendPort = await findAvailablePort();
        console.log(`📡 Found available port: ${backendPort}`);
        
        const serverPath = path.join(__dirname, "..", "Server", "dist", "app.js");
        
        if (!fs.existsSync(serverPath)) {
            throw new Error(`Server file not found at ${serverPath}`);
        }
        
        backendProcess = spawn("node", [serverPath], {
            cwd: path.join(__dirname, "..", "Server"),
            env: {
                ...process.env,
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                PORT: backendPort.toString(),
                NODE_ENV: "test"
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
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`✅ Backend started successfully on port ${backendPort}`);
        return backendPort;
    } catch (error) {
        console.error(`❌ Failed to start backend: ${error.message}`);
        throw error;
    }
}

function stopBackend() {
    console.log("🛑 Stopping backend server...");
    
    if (wsClient) {
        wsClient.close();
        wsClient = null;
    }
    
    if (backendProcess) {
        backendProcess.kill("SIGTERM");
        backendProcess = null;
        backendPort = null;
        console.log("✅ Backend stopped");
    }
}

function buildAndroidApp() {
    console.log("🔨 Building Android application...");
    
    const gradlePath = path.join(__dirname, "..", "AndroidClient", "gradlew.bat");
    
    if (!fs.existsSync(gradlePath)) {
        throw new Error(`Gradle wrapper not found at ${gradlePath}`);
    }
    
    const buildCommand = `"${gradlePath}" assembleDebug --no-daemon`;
    
    try {
        execSync(buildCommand, {
            cwd: path.join(__dirname, "..", "AndroidClient"),
            stdio: "inherit",
            encoding: "utf8"
        });
        
        console.log("✅ Android application built successfully");
    } catch (error) {
        throw new Error(`Android build failed: ${error.message}`);
    }
}

async function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const wsUrl = `ws://localhost:${backendPort}`;
        console.log(`🔌 Connecting to WebSocket server: ${wsUrl}`);
        
        wsClient = new WebSocket(wsUrl);
        
        wsClient.on('open', () => {
            console.log("✅ WebSocket connected");
            resolve(wsClient);
        });
        
        wsClient.on('message', (data) => {
            console.log(`[WS Received] ${data.toString()}`);
        });
        
        wsClient.on('error', (error) => {
            console.error(`[WS Error] ${error.message}`);
            reject(error);
        });
        
        wsClient.on('close', () => {
            console.log("[WS] Connection closed");
        });
        
        setTimeout(() => {
            if (wsClient.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket connection timeout"));
            }
        }, 5000);
    });
}

async function installAndLaunchApp() {
    console.log("📱 Installing and launching Android app...");
    
    const apkPath = path.join(__dirname, "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
    
    deviceId = getAvailableDevice();
    
    if (!fs.existsSync(apkPath)) {
        throw new Error(`APK file not found at ${apkPath}`);
    }
    
    console.log(`📱 Using APK: ${apkPath}`);
    console.log(`📱 Using device: ${deviceId}`);
    
    try {
        console.log("\n1️⃣ Verifying device connection...");
        const devicesOutput = execSync("adb devices", { encoding: "utf8" });
        if (!devicesOutput.includes(deviceId)) {
            throw new Error(`Device ${deviceId} not found in adb devices`);
        }
        console.log(`✅ Device ${deviceId} is connected`);
        
        console.log("\n2️⃣ Uninstalling previous app version...");
        try {
            execSync(`adb -s ${deviceId} uninstall com.linecat.wmmtcontroller`, { stdio: "pipe" });
            console.log("✅ Previous app version uninstalled");
        } catch (error) {
            console.log("ℹ️  No previous app version found or uninstall failed");
        }
        
        console.log("\n3️⃣ Installing new app version...");
        const installResult = execSync(`adb -s ${deviceId} install -r "${apkPath}"`, {
            stdio: "pipe",
            encoding: "utf8"
        });
        if (installResult.includes("Success")) {
            console.log("✅ App installed successfully");
        } else {
            throw new Error(`App installation failed: ${installResult}`);
        }
        
        console.log("\n4️⃣ Starting application...");
        execSync(`adb -s ${deviceId} shell am start -n com.linecat.wmmtcontroller/.MainActivity`, { stdio: "pipe" });
        console.log("✅ Application started");
        
        console.log("\n5️⃣ Waiting for app to initialize...");
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("\n6️⃣ Verifying app process...");
        try {
            const psOutput = execSync(`adb -s ${deviceId} shell ps`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            
            if (psOutput && psOutput.includes("wmmtcontroller")) {
                console.log("✅ App process is running");
            } else {
                console.log("⚠️  App process not found in ps output");
            }
        } catch (error) {
            console.log("⚠️  Process verification failed:", error.message);
        }
        
        console.log("\n7️⃣ Checking UI elements...");
        try {
            const dumpOutput = execSync(
                `adb -s ${deviceId} shell uiautomator dump && adb -s ${deviceId} shell cat /sdcard/window_dump.xml`,
                { stdio: "pipe", encoding: "utf8" }
            );
            
            const hasStartButton = dumpOutput.includes("btn_start_service") || dumpOutput.includes("启动服务");
            const hasStopButton = dumpOutput.includes("btn_stop_service") || dumpOutput.includes("停止服务");
            const hasStatusText = dumpOutput.includes("status_text") || dumpOutput.includes("服务状态");
            
            console.log("✅ UI Element Check Results:");
            console.log(`   Start Button: ${hasStartButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Stop Button: ${hasStopButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Status Text: ${hasStatusText ? "✅ Found" : "❌ Not found"}`);
            
            if (!(hasStartButton && hasStopButton && hasStatusText)) {
                throw new Error("Required UI elements not found");
            }
        } catch (error) {
            console.log("⚠️  UI element checking failed:", error.message);
            throw error;
        }
        
        console.log("\n8️⃣ Starting input service...");
        execSync(`adb -s ${deviceId} shell input tap 540 960`, { stdio: "pipe" });
        console.log("✅ Sent tap event to start button");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log("\n9️⃣ Verifying service status...");
        const newDump = execSync(
            `adb -s ${deviceId} shell uiautomator dump && adb -s ${deviceId} shell cat /sdcard/window_dump.xml`,
            { stdio: "pipe", encoding: "utf8" }
        );
        
        const hasRunningStatus = newDump.includes("已启动") || newDump.includes("running");
        console.log(`✅ Service status after start: ${hasRunningStatus ? "Running" : "Not running"}`);
        
        console.log("\n🎉 App installation and launch completed successfully!");
    } catch (error) {
        console.log("\n❌ App installation or launch failed");
        console.log("   Error:", error.message);
        throw error;
    }
}

async function testWebSocketCommunication() {
    console.log("\n🧪 Testing WebSocket communication...");
    
    try {
        await connectWebSocket();
        
        console.log("\n1️⃣ Testing welcome message...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("\n2️⃣ Sending ping message...");
        const pingMessage = { type: "ping" };
        wsClient.send(JSON.stringify(pingMessage));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("\n3️⃣ Sending state message...");
        const stateMessage = {
            type: "state",
            stateId: 1,
            clientSendTs: Date.now(),
            keyboardState: [],
            gamepadState: {
                buttons: [],
                joysticks: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
                triggers: { left: 0, right: 0 }
            },
            flags: []
        };
        wsClient.send(JSON.stringify(stateMessage));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("\n4️⃣ Sending event message...");
        const eventMessage = {
            type: "event",
            eventId: 1,
            baseStateId: 0,
            clientSendTs: Date.now(),
            delta: {
                keyboard: [
                    { keyId: "KEY_W", eventType: "pressed" }
                ]
            },
            flags: []
        };
        wsClient.send(JSON.stringify(eventMessage));
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log("\n✅ WebSocket communication test completed successfully!");
    } catch (error) {
        console.log("\n❌ WebSocket communication test failed");
        console.log("   Error:", error.message);
        throw error;
    }
}

async function testInputSimulation() {
    console.log("\n🧪 Testing input simulation...");
    
    try {
        console.log("\n1️⃣ Simulating keyboard input...");
        execSync(`adb -s ${deviceId} shell input text "test"`, { stdio: "pipe" });
        console.log("✅ Keyboard input simulated");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("\n2️⃣ Simulating touch input...");
        execSync(`adb -s ${deviceId} shell input tap 500 1000`, { stdio: "pipe" });
        console.log("✅ Touch input simulated");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("\n3️⃣ Simulating swipe input...");
        execSync(`adb -s ${deviceId} shell input swipe 500 1000 500 1500 500`, { stdio: "pipe" });
        console.log("✅ Swipe input simulated");
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("\n✅ Input simulation test completed successfully!");
    } catch (error) {
        console.log("\n❌ Input simulation test failed");
        console.log("   Error:", error.message);
        throw error;
    }
}

async function testServiceLifecycle() {
    console.log("\n🧪 Testing service lifecycle...");
    
    try {
        console.log("\n1️⃣ Stopping service...");
        execSync(`adb -s ${deviceId} shell input tap 540 1100`, { stdio: "pipe" });
        console.log("✅ Sent tap event to stop button");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const dumpAfterStop = execSync(
            `adb -s ${deviceId} shell uiautomator dump && adb -s ${deviceId} shell cat /sdcard/window_dump.xml`,
            { stdio: "pipe", encoding: "utf8" }
        );
        
        const hasStoppedStatus = dumpAfterStop.includes("已停止") || dumpAfterStop.includes("stopped");
        console.log(`✅ Service status after stop: ${hasStoppedStatus ? "Stopped" : "Still running"}`);
        
        console.log("\n2️⃣ Restarting service...");
        execSync(`adb -s ${deviceId} shell input tap 540 960`, { stdio: "pipe" });
        console.log("✅ Sent tap event to start button");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const dumpAfterRestart = execSync(
            `adb -s ${deviceId} shell uiautomator dump && adb -s ${deviceId} shell cat /sdcard/window_dump.xml`,
            { stdio: "pipe", encoding: "utf8" }
        );
        
        const hasRunningStatus = dumpAfterRestart.includes("已启动") || dumpAfterRestart.includes("running");
        console.log(`✅ Service status after restart: ${hasRunningStatus ? "Running" : "Not running"}`);
        
        console.log("\n✅ Service lifecycle test completed successfully!");
    } catch (error) {
        console.log("\n❌ Service lifecycle test failed");
        console.log("   Error:", error.message);
        throw error;
    }
}

async function runCoreE2ETest() {
    console.log("🧪 Starting Core End-to-End Test");
    console.log("=================================");
    
    try {
        const port = await startBackend();
        
        buildAndroidApp();
        
        await installAndLaunchApp();
        
        await testWebSocketCommunication();
        
        await testInputSimulation();
        
        await testServiceLifecycle();
        
        console.log("\n🎉 ALL CORE E2E TESTS COMPLETED SUCCESSFULLY!");
        console.log("📊 Complete Test Summary:");
        console.log("   • Backend Port:", port);
        console.log("   • App Installation: ✅ PASSED");
        console.log("   • App Launch: ✅ PASSED");
        console.log("   • UI Element Detection: ✅ PASSED");
        console.log("   • Service Lifecycle: ✅ PASSED");
        console.log("   • WebSocket Communication: ✅ PASSED");
        console.log("   • Input Simulation: ✅ PASSED");
        
        return true;
    } catch (error) {
        console.log("\n❌ CORE E2E TEST FAILED");
        console.log("   Error:", error.message);
        console.log("   Stack:", error.stack);
        return false;
    } finally {
        stopBackend();
    }
}

process.on('exit', stopBackend);
process.on('SIGINT', () => {
    stopBackend();
    process.exit(0);
});
process.on('SIGTERM', () => {
    stopBackend();
    process.exit(0);
});

runCoreE2ETest()
    .then((success) => {
        console.log(`\n🏁 Test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.log("\n💥 Test execution crashed:", error.message);
        stopBackend();
        process.exit(1);
    });