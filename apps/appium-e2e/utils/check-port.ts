#!/usr/bin/env node

import net from "net";

async function checkPort(port: number): Promise<boolean> {
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

async function main(): Promise<void> {
    const port = 58526;
    const inUse = await checkPort(port);
    
    if (inUse) {
        console.log(`❌ Port ${port} is still in use`);
        console.log("Backend process is still running!");
    } else {
        console.log(`✅ Port ${port} is free`);
        console.log("Backend process stopped properly!");
    }
    
    process.exit(0);
}

main();