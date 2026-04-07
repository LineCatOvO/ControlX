// Entry file, start service

import { startWsServer } from "./ws/server";
import { startInputExecutor, getExecutorManager, isDryRun, printDryRunSummary, getSafetyController } from "./input/executor";
import { initShadowModeIntegration } from "./input/executor_shadow";
import { initRouterOnlyMode } from "./input/RouterOnlyExecutor";
import { StateStore } from "./input/stateStore";
import { ApplyScheduler } from "./input/applyScheduler";
import { HeartbeatModule } from "./input/heartbeat";
import { startWebMonitor } from "./web/webServer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check run mode
const isTestMode = process.env.TEST_MODE === "true";
const disableActualInput = process.env.DISABLE_ACTUAL_INPUT === "true";
const dryRunMode = process.env.DRY_RUN === "true";

// Special configuration for run mode
if (isTestMode || dryRunMode) {
    console.log("=".repeat(60));
    if (dryRunMode) {
        console.log("🏃 Server starting in DRY RUN MODE");
        console.log("📝 All inputs will be logged but not executed");
        console.log("🔍 Useful for debugging and testing");
    } else {
        console.log("🧪 Server starting in TEST MODE");
        console.log(`📝 Actual input disabled: ${disableActualInput}`);
        console.log("🔒 No real keyboard/mouse/gamepad events will be generated");
    }
    console.log("=".repeat(60));
}

// Initialize state store
const stateStore = new StateStore();

// Initialize and start heartbeat module
const heartbeatModule = new HeartbeatModule();
heartbeatModule.start();

// Set heartbeat timeout callback (trigger safety clear)
heartbeatModule.onTimeout(() => {
    console.error("Heartbeat timeout: Triggering safety clear");
    const safetyController = getSafetyController();
    if (safetyController) {
        safetyController.triggerSafetyClear("Heartbeat timeout");
    }
});

// Export heartbeat module to global
(global as any).heartbeatModule = heartbeatModule;

// Start WebSocket server
startWsServer();

// Start input executor
startInputExecutor();

// Initialize shadow mode (if enabled)
initShadowModeIntegration();


// Initialize Router-only mode (if enabled)
initRouterOnlyMode();
// Initialize and start ApplyScheduler
const executorManager = getExecutorManager();
const applyScheduler = new ApplyScheduler(executorManager, stateStore);
applyScheduler.start(Date.now());

// Export global instance for other modules
(global as any).stateStore = stateStore;

// Start web monitor server
startWebMonitor();

// Print startup info
console.log("=".repeat(60));
console.log("  ControlX Server");
console.log("=".repeat(60));
console.log(`  Mode:         ${dryRunMode ? "DRY RUN" : isTestMode ? "TEST" : "PRODUCTION"}`);
console.log(`  WebSocket:    ws://localhost:${process.env.WS_PORT || 3000}`);
console.log(`  Web Monitor:  http://localhost:${process.env.WEB_PORT || 8080}`);
console.log("=".repeat(60));
console.log("  Features:");
console.log("    • Real-time input monitoring via web dashboard");
console.log("    • WebSocket-based state synchronization");
console.log("    • Keyboard, mouse, gamepad, and joystick support");
console.log("=".repeat(60));

// Startup log
if (dryRunMode) {
    console.log("🏃 ControlX Server started in DRY RUN MODE");
    console.log("📋 Dry run features:");
    console.log("   • All inputs logged for verification");
    console.log("   • No actual system events generated");
    console.log("   • Full state tracking and statistics");
    console.log("   • Safe for debugging and testing");
} else if (isTestMode) {
    console.log("🎮 ControlX Server started in TEST MODE");
    console.log("📋 Test mode features:");
    console.log("   • No actual keyboard/mouse events generated");
    console.log("   • All inputs logged for verification");
    console.log("   • Safe for automated testing");
} else {
    console.log("🎮 ControlX Server started successfully");
}

// Handle process termination
try {
    process.on("SIGINT", () => {
        console.log("\nShutting down server...");

        // If dry run mode, print summary
        if (isDryRun()) {
            printDryRunSummary();
        }

        applyScheduler.stop();
        heartbeatModule.stop();
        process.exit(0);
    });
} catch (error) {
    console.error("Error setting up process handlers:", error);
}
