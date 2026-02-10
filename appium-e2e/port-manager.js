const net = require("net");
const config = require("./config");

function findAvailablePort(startPort = config.backend.portRange.start, endPort = config.backend.portRange.end) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        
        server.listen(0, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        
        server.on('error', (err) => {
            reject(err);
        });
    });
}

module.exports = {
    findAvailablePort
};
