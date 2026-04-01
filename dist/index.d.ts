/**
 * ControlX Server Entry Point
 * @description Main entry point for the ControlX server application
 */
/**
 * Server configuration interface
 */
interface ServerConfig {
    port: number;
    host: string;
    nodeEnv: string;
}
/**
 * Get server configuration from environment variables
 */
declare function getServerConfig(): ServerConfig;
/**
 * Main server function
 */
declare function main(): Promise<void>;
export { main, getServerConfig, ServerConfig };
//# sourceMappingURL=index.d.ts.map