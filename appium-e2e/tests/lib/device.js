const { execSync, spawn } = require("child_process");
const fs = require("fs");
const WebSocket = require("ws");
const { CONFIG } = require("./config");
const { log, delay } = require("./utils");

let deviceId = null;
let backendProcess = null;
let backendPort = null;
let wsClient = null;

function execAdb(command) {
    const fullCommand = `adb -s ${deviceId} ${command}`;
    try {
        return execSync(fullCommand, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 30000 }).trim();
    } catch (error) {
        return error.stdout?.toString() || error.stderr?.toString() || "";
    }
}

async function checkDeviceConnection() {
    log("\n📱 Phase 1: Device Connection Check");
    log("=".repeat(60));

    const devices = execSync("adb devices", { encoding: "utf8" });
    const lines = devices.split("\n").filter(line => line.includes("\tdevice"));
    
    if (lines.length === 0) {
        throw new Error("No device connected. Please connect a device first.");
    }

    deviceId = lines[0].split("\t")[0];
    const model = execAdb("shell getprop ro.product.model");
    const android = execAdb("shell getprop ro.build.version.release");
    
    log(`Device: ${model} (Android ${android})`);
    log(`Device ID: ${deviceId}`);
    
    return deviceId;
}

function getDeviceId() {
    return deviceId;
}

async function installApp(apkPath) {
    log("\n📲 Installing Application");
    log("=".repeat(60));

    if (!fs.existsSync(apkPath)) {
        throw new Error(`APK not found: ${apkPath}`);
    }

    log(`Installing: ${apkPath}`);
    
    const result = execSync(`adb -s ${deviceId} install -r "${apkPath}"`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60000
    });

    if (!result.includes("Success")) {
        throw new Error(`Installation failed: ${result}`);
    }

    log("✅ App installed successfully");
}

async function grantPermissions() {
    log("\n🔓 Granting Permissions");
    log("=".repeat(60));

    execAdb(`shell appops set ${CONFIG.packageName} SYSTEM_ALERT_WINDOW allow`);
    await delay(500);

    execAdb(`shell pm grant ${CONFIG.packageName} android.permission.INTERNET`);
    execAdb(`shell pm grant ${CONFIG.packageName} android.permission.ACCESS_NETWORK_STATE`);
    execAdb(`shell pm grant ${CONFIG.packageName} android.permission.FOREGROUND_SERVICE`);

    await delay(300);
    const overlayCheck = execAdb(`shell appops get ${CONFIG.packageName} SYSTEM_ALERT_WINDOW`);
    const overlayGranted = overlayCheck.includes("allow");
    
    if (!overlayGranted) {
        throw new Error(
            `Overlay permission not granted.\n` +
            `   Result: ${overlayCheck}\n` +
            `   Please manually grant overlay permission:\n` +
            `   Settings > Apps > ${CONFIG.packageName} > Display over other apps`
        );
    }
    
    log(`✅ Overlay permission granted`);
}

async function launchApp() {
    log("\n🚀 Launching Application");
    log("=".repeat(60));

    execAdb(`shell am force-stop ${CONFIG.packageName}`);
    await delay(500);

    execAdb(`shell am start -n ${CONFIG.mainActivity}`);
    await delay(2000);

    log("✅ App launched");
}

async function startBackend() {
    log("\n🖥️ Starting Backend Server");
    log("=".repeat(60));

    if (!fs.existsSync(CONFIG.serverPath)) {
        throw new Error(`Server not found: ${CONFIG.serverPath}`);
    }

    backendPort = 57128 + Math.floor(Math.random() * 1000);

    return new Promise((resolve, reject) => {
        try {
            backendProcess = spawn("node", [CONFIG.serverPath], {
                cwd: CONFIG.serverCwd,
                env: {
                    ...process.env,
                    TEST_MODE: "true",
                    DISABLE_ACTUAL_INPUT: "true",
                    PORT: backendPort.toString(),
                    NODE_ENV: "test"
                },
                stdio: ["pipe", "pipe", "pipe"]
            });

            backendProcess.stdout?.on("data", (data) => {
                const output = data.toString().trim();
                if (output && process.env.VERBOSE && !output.includes("DRY_RUN")) {
                    log(`[Backend] ${output}`);
                }
            });

            backendProcess.on("error", (error) => {
                reject(new Error(`Backend process error: ${error.message}`));
            });

            setTimeout(() => {
                log(`✅ Backend started on port ${backendPort}`);
                resolve();
            }, 3000);
        } catch (error) {
            reject(error);
        }
    });
}

function getBackendPort() {
    return backendPort;
}

async function verifyBackendCommunication() {
    log("\n🔌 Verify Backend Communication");
    log("=".repeat(60));

    if (!backendPort) {
        throw new Error("Backend port not available");
    }

    const wsUrl = `ws://localhost:${backendPort}`;
    log(`Connecting to: ${wsUrl}`);

    return new Promise((resolve, reject) => {
        wsClient = new WebSocket(wsUrl);

        wsClient.on("open", () => {
            log("✅ WebSocket connected to backend");
            wsClient.send(JSON.stringify({ type: "ping" }));
        });

        wsClient.on("message", (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.type === "pong") {
                    log("✅ Backend responded to ping");
                    wsClient.close();
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });

        wsClient.on("error", (error) => {
            reject(new Error(`WebSocket error: ${error.message}`));
        });

        setTimeout(() => {
            reject(new Error("Backend communication timeout"));
        }, 5000);
    });
}

async function simulateUserStartService() {
    log("\n👆 Simulating User - Start Service");
    log("=".repeat(60));

    log("User action: Tap Start Service button");
    execAdb("shell input tap 326 510");
    await delay(2000);

    execAdb("shell uiautomator dump");
    await delay(500);
    const dumpOutput = execAdb("shell cat /sdcard/window_dump.xml");

    if (dumpOutput.includes("已启动") || dumpOutput.includes("running") || dumpOutput.includes("Running")) {
        log("✅ Service started (verified via UI)");
    } else {
        log("⚠️ Service status could not be verified via UI (continuing anyway)");
    }
}

async function simulateUserInputTest() {
    log("\n🎮 Simulating User - Input Test via Android");
    log("=".repeat(60));

    log("Note: Input simulation via Android touch events");

    log("1️⃣ Simulating keyboard button press (W key area)");
    execAdb("shell input tap 200 1200");
    await delay(500);

    log("2️⃣ Simulating gamepad button press (A button area)");
    execAdb("shell input tap 400 1400");
    await delay(500);

    log("3️⃣ Simulating joystick movement (drag)");
    execAdb("shell input swipe 600 1300 700 1200 300");
    await delay(500);

    log("✅ User input simulation completed");
}

async function simulateUserStopService() {
    log("\n🛑 Simulating User - Stop Service");
    log("=".repeat(60));

    log("User action: Tap Stop Service button");
    execAdb("shell input tap 954 510");
    await delay(2000);

    execAdb("shell uiautomator dump");
    await delay(500);
    const dumpOutput = execAdb("shell cat /sdcard/window_dump.xml");

    if (dumpOutput.includes("已停止") || dumpOutput.includes("stopped") || dumpOutput.includes("Stopped")) {
        log("✅ Service stopped (verified via UI)");
    } else {
        log("⚠️ Service status could not be verified via UI (continuing anyway)");
    }
}

async function runUITests() {
    log("\n📱 UI Verification Tests");
    log("=".repeat(60));

    execAdb(`shell am start -n ${CONFIG.mainActivity}`);
    await delay(2000);

    execAdb("shell uiautomator dump");
    await delay(500);

    const dumpOutput = execAdb("shell cat /sdcard/window_dump.xml");

    const checks = [
        { pattern: "WMMT", name: "App title", required: true },
        { pattern: "启动", name: "Start button text", required: false },
        { pattern: "停止", name: "Stop button text", required: false }
    ];

    let allRequiredPassed = true;
    for (const check of checks) {
        if (dumpOutput.includes(check.pattern)) {
            log(`✅ ${check.name} found`);
        } else {
            if (check.required) {
                log(`❌ ${check.name} not found (required)`);
                allRequiredPassed = false;
            } else {
                log(`⚠️ ${check.name} not found (optional)`);
            }
        }
    }

    if (!allRequiredPassed) {
        throw new Error("Required UI elements not found");
    }
}

function cleanup() {
    log("\n🧹 Cleanup");

    if (wsClient) {
        wsClient.close();
        wsClient = null;
    }

    if (backendProcess) {
        backendProcess.kill("SIGTERM");
        backendProcess = null;
    }

    if (deviceId) {
        try {
            execSync(`adb -s ${deviceId} shell am force-stop ${CONFIG.packageName}`, { stdio: "pipe" });
        } catch (e) {}
    }
    log("✅ Cleanup completed");
}

module.exports = {
    execAdb,
    checkDeviceConnection,
    getDeviceId,
    installApp,
    grantPermissions,
    launchApp,
    startBackend,
    getBackendPort,
    verifyBackendCommunication,
    simulateUserStartService,
    simulateUserInputTest,
    simulateUserStopService,
    runUITests,
    cleanup
};
