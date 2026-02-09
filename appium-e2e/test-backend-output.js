#!/usr/bin/env node

const backendManager = require("./helpers/test-backend");

async function testBackend() {
    console.log("Starting backend test...\n");

    const started = await backendManager.startBackend();
    
    if (started) {
        console.log("=== Backend Output ===");
        console.log(backendManager.getBackendOutput());
        
        if (backendManager.getBackendError()) {
            console.log("\n=== Backend Errors ===");
            console.log(backendManager.getBackendError());
        }
        
        console.log("\n=== Backend Port ===");
        console.log(`Port: ${backendManager.backendPort}`);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await backendManager.stopBackend();
        
        console.log("\n=== Final Output ===");
        console.log(backendManager.getBackendOutput());
        
        console.log("\nTest completed successfully!");
    } else {
        console.log("Failed to start backend");
        console.log("=== Errors ===");
        console.log(backendManager.getBackendError());
    }
    
    process.exit(0);
}

testBackend();