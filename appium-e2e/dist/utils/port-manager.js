"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAvailablePort = findAvailablePort;
const net_1 = __importDefault(require("net"));
const config_1 = __importDefault(require("./config"));
function findAvailablePort(startPort = config_1.default.backend.portRange.start, endPort = config_1.default.backend.portRange.end) {
    return new Promise((resolve, reject) => {
        const server = net_1.default.createServer();
        server.listen(0, () => {
            const address = server.address();
            if (address && typeof address === 'object' && 'port' in address) {
                const port = address.port;
                server.close(() => resolve(port));
            }
            else {
                reject(new Error("Failed to get server address"));
            }
        });
        server.on('error', (err) => {
            reject(err);
        });
    });
}
