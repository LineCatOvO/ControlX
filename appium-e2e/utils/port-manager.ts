import net from "net";
import config from "./config";

function findAvailablePort(startPort: number = config.backend.portRange.start, endPort: number = config.backend.portRange.end): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.listen(0, () => {
            const address = server.address();
            if (address && typeof address === 'object' && 'port' in address) {
                const port = address.port;
                server.close(() => resolve(port));
            } else {
                reject(new Error("Failed to get server address"));
            }
        });
        
        server.on('error', (err) => {
            reject(err);
        });
    });
}

export {
    findAvailablePort
};