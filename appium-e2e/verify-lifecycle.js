#!/usr/bin/env node

const { spawn } = require("child_process");
const net = require("net");

async function checkPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

async function testLifecycle() {
    console.log("Testing lifecycle binding...\n");

    const testProcess = spawn("node", ["helpers/test-runner.js"], {
        cwd: process.cwd(),
        stdio: "pipe",
    });

    let backendPort = null;

    testProcess.stdout.on("data", (data) => {
        const output = data.toString();
        const portMatch = output.match(/Port:\s*(\d+)/);
        if (portMatch) {
            backendPort = parseInt(portMatch[1]);
            console.log(`Backend started on port ${backendPort}`);
        }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("\nTerminating test process...");
    testProcess.kill('SIGTERM');

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (backendPort) {
        const portInUse = await checkPortInUse(backendPort);
        if (portInUse) {
            console.log(`❌ FAIL: Port ${backendPort} is still in use after script termination`);
            console.log("Backend process did not stop properly!");
        } else {
            console.log(`✅ PASS: Port ${backendPort} is free after script termination`);
            console.log("Backend process stopped properly!");
        }
    }

    process.exit(0);
}

testLifecycle();