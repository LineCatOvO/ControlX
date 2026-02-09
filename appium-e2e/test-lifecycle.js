#!/usr/bin/env node

const backendManager = require("./helpers/test-backend");

async function testBackendLifecycle() {
    console.log("Testing backend lifecycle...\n");

    const started = await backendManager.startBackend();
    
    if (started) {
        console.log("Backend started successfully");
        console.log(`Port: ${backendManager.backendPort}`);
        console.log("\nWaiting 3 seconds before stopping...\n");
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log("Stopping backend...");
        await backendManager.stopBackend();
        
        console.log("\n=== Backend Output ===");
        console.log(backendManager.getBackendOutput());
        
        console.log("\nTest completed!");
    } else {
        console.log("Failed to start backend");
        console.log("=== Errors ===");
        console.log(backendManager.getBackendError());
    }
    
    process.exit(0);
}

testBackendLifecycle();