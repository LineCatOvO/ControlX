#!/usr/bin/env node
"use strict";
const backendManager = require("./helpers/test-backend");
async function testLifecycle() {
    console.log("Starting backend lifecycle test...\n");
    const started = await backendManager.startBackend();
    if (started) {
        console.log(`Backend started on port ${backendManager.backendPort}`);
        console.log("Backend process PID:", backendManager.backendProcess.pid);
        console.log("\nWaiting 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("\nTest completed. Backend should stop automatically when script exits.");
    }
    else {
        console.log("Failed to start backend");
        console.log("Errors:", backendManager.getBackendError());
    }
}
testLifecycle();
