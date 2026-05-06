#!/usr/bin/env node

const { execSync } = require("child_process");
const { CONFIG } = require("./lib/config");
const { log, question, delay, closeReadline } = require("./lib/utils");
const { buildServer, runParallelBuild } = require("./lib/build");
const { buildAndroid } = require("./lib/android-sdk");
const {
    checkDeviceConnection,
    installApp,
    grantPermissions,
    launchApp,
    startBackend,
    verifyBackendCommunication,
    simulateUserStartService,
    simulateUserInputTest,
    simulateUserStopService,
    runUITests,
    cleanup
} = require("./lib/device");

let testResults = [];
let startTime = 0;
let verbose = false;
let skipBuild = false;

async function runTest(name, testFn) {
    const testStart = Date.now();
    log(`🧪 Starting: ${name}`);

    try {
        await testFn();
        const duration = Date.now() - testStart;
        log(`✅ Passed: ${name} (${duration}ms)`);
        testResults.push({ name, passed: true, duration });
        return true;
    } catch (error) {
        const duration = Date.now() - testStart;
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`❌ Failed: ${name} - ${errorMessage}`);
        testResults.push({ name, passed: false, duration, error: errorMessage });
        return false;
    }
}

async function checkDependencies() {
    log("\n📦 Phase 0: Checking Dependencies");
    log("=".repeat(60));

    const checks = [
        { cmd: "node --version", name: "Node.js" },
        { cmd: "npm --version", name: "npm" },
        { cmd: "adb version", name: "ADB" }
    ];

    for (const check of checks) {
        try {
            const result = execSync(check.cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
            log(`✅ ${check.name}: ${result.split("\n")[0]}`);
        } catch (error) {
            throw new Error(`${check.name} not found. Please install it first.`);
        }
    }

    const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    const gradlewPath = require("path").join(CONFIG.androidProjectPath, gradlew);
    const fs = require("fs");
    if (!fs.existsSync(gradlewPath)) {
        throw new Error(`Gradle wrapper not found: ${gradlewPath}`);
    }
    log(`✅ Gradle wrapper found`);
}

function printSummary() {
    const totalDuration = Date.now() - startTime;
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const deviceId = require("./lib/device").getDeviceId?.() || "N/A";
    const backendPort = require("./lib/device").getBackendPort?.() || "N/A";

    console.log("\n" + "=".repeat(60));
    console.log("📊 PIPELINE TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`Device: ${deviceId}`);
    console.log(`Backend Port: ${backendPort}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Tests: ${testResults.length} total, ${passed} passed, ${failed} failed`);
    console.log("-".repeat(60));

    for (const result of testResults) {
        const status = result.passed ? "✅" : "❌";
        console.log(`${status} ${result.name} (${result.duration}ms)`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    console.log("=".repeat(60));
    const passRate = testResults.length > 0
        ? ((passed / testResults.length) * 100).toFixed(1)
        : "0.0";
    console.log(`Pass Rate: ${passRate}%`);
    console.log("=".repeat(60));
}

async function main() {
    const args = process.argv.slice(2);
    verbose = args.includes("-v") || args.includes("--verbose");
    skipBuild = args.includes("--skip-build");
    
    if (verbose) {
        process.env.VERBOSE = "true";
    }

    startTime = Date.now();
    log("🧪 Starting Pipeline E2E Test");
    log("=".repeat(60));

    try {
        if (!await runTest("Dependencies Check", () => checkDependencies())) {
            throw new Error("Dependencies check failed, stopping.");
        }
        
        if (!await runTest("Device Connection", () => checkDeviceConnection())) {
            throw new Error("Device connection failed, stopping.");
        }
        
        if (!skipBuild) {
            if (!await runTest("Parallel Build", () => runParallelBuild(buildServer, buildAndroid))) {
                throw new Error("Build failed, stopping.");
            }
        } else {
            log("\n⏭️ Skipping build (--skip-build flag)");
            testResults.push({ name: "Build", passed: true, duration: 0 });
        }

        if (!await runTest("Install App", () => installApp(CONFIG.apkOutputPath))) {
            throw new Error("App installation failed, stopping.");
        }
        
        if (!await runTest("Start Backend", () => startBackend())) {
            throw new Error("Backend startup failed, stopping.");
        }
        
        if (!await runTest("Grant Permissions", () => grantPermissions())) {
            throw new Error("Permission grant failed, stopping.");
        }
        
        await runTest("Launch App", () => launchApp());
        await runTest("User: Start Service", () => simulateUserStartService());
        await runTest("User: Input Test", () => simulateUserInputTest());
        await runTest("User: Stop Service", () => simulateUserStopService());
        await runTest("Backend Communication", () => verifyBackendCommunication());
        await runTest("UI Tests", () => runUITests());

        const success = testResults.every(r => r.passed);
        console.log(`\n🏁 Pipeline test finished: ${success ? "SUCCESS" : "FAILURE"}`);
        closeReadline();
        process.exit(success ? 0 : 1);
    } catch (error) {
        log(`\n❌ PIPELINE STOPPED: ${error instanceof Error ? error.message : String(error)}`);
        closeReadline();
        process.exit(1);
    } finally {
        cleanup();
        printSummary();
    }
}

main();
