const axios = require("axios");

// API helper for server-side validation
exports.api = axios.create({
    baseURL: "http://localhost:8080/api",
});

// Helper functions for common API operations
exports.helpers = {
    // Wait for server to be ready
    async waitForServer(timeout = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            try {
                const response = await exports.api.get("/health");
                if (
                    response.data.status === "test" ||
                    response.data.mode === "test"
                ) {
                    console.log("✅ Server is ready in test mode");
                    return true;
                }
            } catch (error) {
                // Continue waiting
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error("Server not ready in test mode within timeout");
    },

    // Validate connection status
    async getConnectionStatus() {
        try {
            const response = await exports.api.get("/status");
            return response.data;
        } catch (error) {
            throw new Error(
                `Failed to get connection status: ${error.message}`
            );
        }
    },

    // Send test input event to server
    async sendTestInput(inputData) {
        try {
            const response = await exports.api.post("/input/test", inputData);
            return response.data;
        } catch (error) {
            throw new Error(`Failed to send test input: ${error.message}`);
        }
    },

    // Verify test mode is active
    async verifyTestMode() {
        try {
            const response = await exports.api.get("/health");
            const data = response.data;

            const isTestMode = data.status === "test" || data.mode === "test";
            const inputDisabled = data.features?.actualInputDisabled === true;

            console.log(`🧪 Test Mode Verification:`);
            console.log(`   Active: ${isTestMode}`);
            console.log(`   Input Disabled: ${inputDisabled}`);

            return {
                isTestMode,
                inputDisabled,
                serverInfo: data,
            };
        } catch (error) {
            throw new Error(`Failed to verify test mode: ${error.message}`);
        }
    },

    // Get test execution logs
    async getTestLogs() {
        try {
            const response = await exports.api.get("/test/logs");
            return response.data;
        } catch (error) {
            // Test logs endpoint might not exist in all configurations
            console.log("⚠️ Test logs endpoint not available");
            return null;
        }
    },

    // Reset test environment
    async resetTestEnvironment() {
        try {
            const response = await exports.api.post("/test/reset");
            return response.data;
        } catch (error) {
            console.log("⚠️ Test reset endpoint not available");
            return null;
        }
    },
};
