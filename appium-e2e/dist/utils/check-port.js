#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
async function checkPort(port) {
    return new Promise((resolve) => {
        const server = net_1.default.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}
async function main() {
    const port = 58526;
    const inUse = await checkPort(port);
    if (inUse) {
        console.log(`❌ Port ${port} is still in use`);
        console.log("Backend process is still running!");
    }
    else {
        console.log(`✅ Port ${port} is free`);
        console.log("Backend process stopped properly!");
    }
    process.exit(0);
}
main();
