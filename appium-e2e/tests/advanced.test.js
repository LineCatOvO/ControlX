const { test, expect } = require("@playwright/test");
const device = require("../helpers/device");
const { api, helpers } = require("../helpers/api");

test.describe("Advanced Integration Tests", () => {
    test.beforeAll(async () => {
        await device.initDriver();
        await helpers.waitForServer();
    });

    test.afterAll(async () => {
        await device.quit();
    });

    test("Full End-to-End Flow Test", async () => {
        // 1. Launch app and start service
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // 2. Enable debug mode programmatically
        // This assumes we can trigger debug mode through API or adb
        try {
            await api.post("/debug/enable");
            console.log("Debug mode enabled via API");
        } catch (error) {
            console.log("Falling back to UI method for debug mode");
            // Alternative UI-based approach if API not available
        }

        // 3. Configure server connection
        await device.typeText("et_address", "localhost");
        await device.typeText("et_port", "8080");

        // 4. Connect to server
        await device.tapElement("btn_start_connect");
        await device.sleep(3000);

        // 5. Verify connection through both UI and API
        const uiStatus = await device.getElementText("status_text");
        const apiStatus = await helpers.getConnectionStatus();

        expect(uiStatus).toContain("已启动");
        expect(apiStatus.connected).toBeTruthy();

        // 6. Test input simulation
        const testInputs = [
            { x: 100, y: 100, action: "tap" },
            { x: 540, y: 960, action: "tap" }, // Screen center
            { x: 1000, y: 1800, action: "tap" }, // Bottom right
        ];

        for (const input of testInputs) {
            await helpers.sendTestInput({
                type: "touch",
                ...input,
            });
            await device.sleep(500);
        }

        // 7. Verify inputs were received
        const finalStatus = await helpers.getConnectionStatus();
        expect(finalStatus.inputsReceived).toBeGreaterThanOrEqual(
            testInputs.length
        );

        await device.takeScreenshot("full_e2e_flow_complete.png");
    });

    test("Performance and Stress Testing", async () => {
        // Start service
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Rapid input simulation
        const startTime = Date.now();
        const rapidInputs = [];

        // Generate 50 rapid touch events
        for (let i = 0; i < 50; i++) {
            rapidInputs.push({
                type: "touch",
                x: Math.floor(Math.random() * 1080),
                y: Math.floor(Math.random() * 1920),
                action: "tap",
            });
        }

        // Send all inputs rapidly
        const sendPromises = rapidInputs.map((input) =>
            helpers.sendTestInput(input)
        );

        await Promise.all(sendPromises);
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const avgResponseTime = totalTime / rapidInputs.length;

        console.log(`Sent ${rapidInputs.length} inputs in ${totalTime}ms`);
        console.log(`Average response time: ${avgResponseTime}ms`);

        // Verify all inputs were processed
        const status = await helpers.getConnectionStatus();
        expect(status.inputsReceived).toBeGreaterThanOrEqual(50);

        // Performance assertions
        expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
        expect(totalTime).toBeLessThan(5000); // Total under 5 seconds

        await device.takeScreenshot("stress_test_results.png");
    });

    test("Error Handling and Recovery", async () => {
        // Start service
        await device.tapElement("btn_start_service");
        await device.sleep(2000);

        // Test invalid server address
        await device.typeText("et_address", "invalid.server.address");
        await device.typeText("et_port", "99999"); // Invalid port

        await device.tapElement("btn_start_connect");
        await device.sleep(2000);

        // Should show connection error
        const errorStatus = await device.getElementText("status_text");
        expect(errorStatus).toContain("连接失败");

        // Test recovery with valid address
        await device.typeText("et_address", "localhost");
        await device.typeText("et_port", "8080");

        await device.tapElement("btn_start_connect");
        await device.sleep(3000);

        const successStatus = await device.getElementText("status_text");
        expect(successStatus).toContain("已启动");

        await device.takeScreenshot("error_handling_test.png");
    });
});
