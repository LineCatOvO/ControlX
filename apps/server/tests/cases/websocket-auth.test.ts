import { WsClient } from "../common/wsClient";
import {
    startWsServer,
    stopWsServer,
    getActualPort,
} from "../../src/ws/server";
import { authManager } from "../../src/auth/auth";

describe("WebSocket Authentication Tests", () => {
    let client: WsClient;
    let serverPort: number;
    let validToken: string;

    beforeAll(async () => {
        serverPort = await startWsServer();
        // Generate a valid token for testing
        const tokenInfo = authManager.generateToken("test-client", ["input", "config_read"]);
        validToken = tokenInfo.token;
    });

    afterAll(async () => {
        await stopWsServer();
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
    });

    test("should reject connection without token when auth is enabled", async () => {
        // Check if auth is enabled
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        client = new WsClient({ url: `ws://localhost:${serverPort}` });
        
        await expect(client.connect()).rejects.toThrow();
    });

    test("should reject connection with invalid token", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        client = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=invalid_token_12345` 
        });
        
        await expect(client.connect()).rejects.toThrow();
    });

    test("should accept connection with valid token", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        client = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=${validToken}` 
        });
        
        await expect(client.connect()).resolves.not.toThrow();
        
        // Verify welcome message is received
        const welcomeMsg = await client.waitForMessage("welcome", 5000);
        expect(welcomeMsg).toHaveProperty("type", "welcome");
        expect(welcomeMsg).toHaveProperty("message", "Connected to ControlX Server");
    }, 10000);

    test("should enforce max connections per token", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        const maxConnections = config.maxConnectionsPerToken;
        const clients: WsClient[] = [];

        try {
            // Create connections up to the limit
            for (let i = 0; i < maxConnections; i++) {
                const c = new WsClient({ 
                    url: `ws://localhost:${serverPort}?token=${validToken}` 
                });
                await c.connect();
                clients.push(c);
            }

            // Next connection should be rejected
            const extraClient = new WsClient({ 
                url: `ws://localhost:${serverPort}?token=${validToken}` 
            });
            
            await expect(extraClient.connect()).rejects.toThrow();
        } finally {
            // Clean up all clients
            clients.forEach(c => c.close());
        }
    }, 20000);

    test("should decrement connection count on disconnect", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        // Generate a new token for this test
        const tokenInfo = authManager.generateToken("test-client-disconnect", ["input"]);
        const testToken = tokenInfo.token;

        // Connect client
        client = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=${testToken}` 
        });
        await client.connect();

        // Disconnect
        client.close();
        client = null as any;

        // Wait for disconnection to be processed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should be able to connect again with the same token
        const newClient = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=${testToken}` 
        });
        
        await expect(newClient.connect()).resolves.not.toThrow();
        newClient.close();
    }, 10000);

    test("should handle multiple tokens independently", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        // Generate two different tokens
        const tokenInfo1 = authManager.generateToken("test-client-1", ["input"]);
        const tokenInfo2 = authManager.generateToken("test-client-2", ["input"]);
        
        const client1 = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=${tokenInfo1.token}` 
        });
        const client2 = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=${tokenInfo2.token}` 
        });

        try {
            // Both should connect successfully
            await expect(client1.connect()).resolves.not.toThrow();
            await expect(client2.connect()).resolves.not.toThrow();

            // Verify both receive welcome messages
            const welcome1 = await client1.waitForMessage("welcome", 5000);
            const welcome2 = await client2.waitForMessage("welcome", 5000);
            
            expect(welcome1).toHaveProperty("type", "welcome");
            expect(welcome2).toHaveProperty("type", "welcome");
        } finally {
            client1.close();
            client2.close();
        }
    }, 15000);

    test("should reject expired token", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        // Generate a token with very short expiry
        const originalExpiry = config.tokenExpiry;
        authManager.updateConfig({ tokenExpiry: 1 }); // 1ms expiry
        
        const tokenInfo = authManager.generateToken("test-client-expired", ["input"]);
        const expiredToken = tokenInfo.token;

        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            client = new WsClient({ 
                url: `ws://localhost:${serverPort}?token=${expiredToken}` 
            });
            
            await expect(client.connect()).rejects.toThrow();
        } finally {
            // Restore original expiry
            authManager.updateConfig({ tokenExpiry: originalExpiry });
        }
    }, 10000);
});

describe("WebSocket Authentication Edge Cases", () => {
    let serverPort: number;
    let validToken: string;

    beforeAll(async () => {
        serverPort = await startWsServer();
        const tokenInfo = authManager.generateToken("test-client-edge", ["input", "config_read"]);
        validToken = tokenInfo.token;
    });

    afterAll(async () => {
        await stopWsServer();
    });

    test("should handle empty token parameter", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        const client = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=` 
        });
        
        await expect(client.connect()).rejects.toThrow();
    });

    test("should handle malformed token", async () => {
        const config = authManager.getConfig();
        if (!config.enabled) {
            console.log("Auth is disabled, skipping test");
            return;
        }

        const client = new WsClient({ 
            url: `ws://localhost:${serverPort}?token=!!!malformed@@@` 
        });
        
        await expect(client.connect()).rejects.toThrow();
    });

    test("should accept connection when auth is disabled", async () => {
        // Temporarily disable auth
        const originalConfig = authManager.getConfig();
        authManager.updateConfig({ enabled: false });

        try {
            const client = new WsClient({ 
                url: `ws://localhost:${serverPort}` 
            });
            
            await expect(client.connect()).resolves.not.toThrow();
            
            // Verify welcome message
            const welcomeMsg = await client.waitForMessage("welcome", 5000);
            expect(welcomeMsg).toHaveProperty("type", "welcome");
            
            client.close();
        } finally {
            // Restore auth config
            authManager.updateConfig({ enabled: originalConfig.enabled });
        }
    }, 10000);
});
