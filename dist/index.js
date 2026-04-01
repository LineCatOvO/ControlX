/**
 * ControlX Server Entry Point
 * @description Main entry point for the ControlX server application
 */
import { config } from 'dotenv';
// Load environment variables from .env file
config();
/**
 * Get server configuration from environment variables
 */
function getServerConfig() {
    return {
        port: parseInt(process.env['PORT'] ?? '3000', 10),
        host: process.env['HOST'] ?? '0.0.0.0',
        nodeEnv: process.env['NODE_ENV'] ?? 'development',
    };
}
/**
 * Main server function
 */
async function main() {
    const config = getServerConfig();
    console.log('='.repeat(50));
    console.log('ControlX Server');
    console.log('='.repeat(50));
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Host: ${config.host}`);
    console.log(`Port: ${config.port}`);
    console.log('='.repeat(50));
    console.log('Server is ready to accept connections');
    console.log('='.repeat(50));
    // TODO: Initialize server, database connections, etc.
    // This is a minimal entry point for build verification
}
// Run main function
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
export { main, getServerConfig };
//# sourceMappingURL=index.js.map