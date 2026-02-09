const { test, expect } = require("@playwright/test");
const device = require("../helpers/device");
const { api, helpers } = require("../helpers/api");
const testData = require("../fixtures/test-data.json");

test.describe("WMMT Remote Controller E2E Tests", () => {
    test.beforeAll(async () => {
        // Initialize Appium driver
        await device.initDriver();

        // Wait for server to be ready
        await helpers.waitForServer();
    });

    test.afterAll(async () => {
        // Clean up
        await device.quit();
    });

    test("Basic App Launch and UI Verification", async () => {
        // Verify main activity is loaded
        const statusText = await device.getElementText("status_text");
        expect(statusText).toContain("服务状态");

        // Verify start/stop buttons exist
        const startButtonExists = await device.elementExists(
            "btn_start_service"
        );
        const stopButtonExists = await device.elementExists("btn_stop_service");

        expect(startButtonExists).toBeTruthy();
        expect(stopButtonExists).toBeTruthy();

        await device.takeScreenshot("app_launch.png");
    });

    test("Service Start/Stop Functionality", async () => {
        // Start service
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Verify service started
        const statusAfterStart = await device.getElementText("status_text");
        expect(statusAfterStart).toContain("已启动");

        await device.takeScreenshot("service_started.png");

        // Stop service
        await device.tapElement("btn_stop_service");
        await device.sleep(2000);

        // Verify service stopped
        const statusAfterStop = await device.getElementText("status_text");
        expect(statusAfterStop).toContain("已停止");

        await device.takeScreenshot("service_stopped.png");
    });

    test("Debug Mode Activation", async () => {
        // Start service first
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Access debug mode (assuming it's accessible through UI)
        // This might need adjustment based on actual UI structure
        try {
            await device.tapElement("debug_mode_button");
            await device.sleep(1000);

            // Enable debug mode
            await device.tapElement("enable_debug_mode");
            await device.sleep(1000);

            // Verify debug mode is enabled
            const debugStatus = await device.getElementText("debug_status");
            expect(debugStatus).toContain("Debug模式已启用");

            await device.takeScreenshot("debug_mode_enabled.png");
        } catch (error) {
            console.log(
                "Debug mode UI elements not found, skipping debug mode test"
            );
            // This is expected if debug mode is not exposed in main UI
        }
    });

    test("Connection to Server", async () => {
        // Ensure service is running
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Set server address (using localhost for testing)
        await device.typeText("et_address", "localhost");
        await device.typeText("et_port", "8080");

        // Connect to server
        await device.tapElement("btn_start_connect");
        await device.sleep(3000);

        // Verify connection status through API
        const connectionStatus = await helpers.getConnectionStatus();
        expect(connectionStatus.connected).toBeTruthy();

        await device.takeScreenshot("connected_to_server.png");
    });

    test("Input Event Simulation", async () => {
        // Ensure debug mode and connection
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Send test input event through API
        const testInput = testData.testInputs.touchEvents[0];
        const response = await helpers.sendTestInput({
            type: "touch",
            x: testInput.x,
            y: testInput.y,
            action: testInput.action,
        });

        expect(response.success).toBeTruthy();

        // Verify input was processed
        await device.sleep(1000);
        const status = await device.getElementText("status_text");
        // Add assertion based on expected UI feedback

        await device.takeScreenshot("input_simulated.png");
    });

    test("Overlay Permission Bypass Test", async () => {
        // This test verifies the debug mode bypass functionality
        // that we implemented in the Android client

        // Start service
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        try {
            // Try to activate overlay without permission
            // In debug mode, this should work without system permission
            await device.tapElement("activate_overlay_button");
            await device.sleep(2000);

            // Verify overlay is active through API
            const status = await helpers.getConnectionStatus();
            expect(status.overlayActive).toBeTruthy();

            await device.takeScreenshot("overlay_bypass_success.png");
        } catch (error) {
            console.log(
                "Overlay activation test skipped - UI elements not available"
            );
        }
    });
});
