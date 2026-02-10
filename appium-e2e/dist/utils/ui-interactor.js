"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const config_1 = __importDefault(require("./config"));
class UIInteractor {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
    }
    async dumpUI() {
        const deviceId = this.deviceManager.getDeviceId();
        if (!deviceId) {
            throw new Error("Device ID not available");
        }
        try {
            (0, child_process_1.execSync)(`adb -s ${deviceId} shell uiautomator dump`, { stdio: "pipe" });
            const dumpOutput = (0, child_process_1.execSync)(`adb -s ${deviceId} shell cat /sdcard/window_dump.xml`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            return dumpOutput;
        }
        catch (error) {
            throw new Error(`UI dump failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async checkUIElements() {
        console.log("\n7️⃣ Checking UI elements...");
        try {
            const dumpOutput = await this.dumpUI();
            const elements = {
                titleText: dumpOutput.includes("title_text") || dumpOutput.includes("WMMT 远程控制器"),
                statusText: dumpOutput.includes("status_text") || dumpOutput.includes("服务状态"),
                startButton: dumpOutput.includes("btn_start_service") || dumpOutput.includes("启动服务"),
                stopButton: dumpOutput.includes("btn_stop_service") || dumpOutput.includes("停止服务"),
                hintText: dumpOutput.includes("浮窗将自动显示在屏幕上")
            };
            console.log("✅ UI Element Check Results:");
            console.log(`   Title Text: ${elements.titleText ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Status Text: ${elements.statusText ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Start Button: ${elements.startButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Stop Button: ${elements.stopButton ? "✅ Found" : "❌ Not found"}`);
            console.log(`   Hint Text: ${elements.hintText ? "✅ Found" : "❌ Not found"}`);
            return elements;
        }
        catch (error) {
            console.log("⚠️  UI element checking failed:", error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    async clickElement(x, y) {
        const deviceId = this.deviceManager.getDeviceId();
        if (!deviceId) {
            throw new Error("Device ID not available");
        }
        try {
            (0, child_process_1.execSync)(`adb -s ${deviceId} shell input tap ${x} ${y}`, { stdio: "pipe" });
            console.log(`✅ Sent tap event to (${x}, ${y})`);
            return true;
        }
        catch (error) {
            throw new Error(`Click element failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async verifyServiceStatus(expectedStatus) {
        console.log(`📱 Verifying service status: ${expectedStatus}`);
        try {
            const dumpOutput = await this.dumpUI();
            if (expectedStatus === "running") {
                const hasRunningStatus = dumpOutput.includes("已启动") || dumpOutput.includes("running");
                console.log(`✅ Service status: ${hasRunningStatus ? "Running" : "Not running"}`);
                return hasRunningStatus;
            }
            else if (expectedStatus === "stopped") {
                const hasStoppedStatus = dumpOutput.includes("已停止") || dumpOutput.includes("stopped");
                console.log(`✅ Service status: ${hasStoppedStatus ? "Stopped" : "Still running"}`);
                return hasStoppedStatus;
            }
            return false;
        }
        catch (error) {
            console.log("⚠️  Service status verification failed:", error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    async requestOverlayPermission() {
        console.log("📱 Requesting overlay permission...");
        console.log("🔒 Strict verification mode enabled");
        const deviceId = this.deviceManager.getDeviceId();
        const appName = "WMMTController";
        const packageName = "com.linecat.wmmtcontroller";
        if (!deviceId) {
            throw new Error("Device ID not available");
        }
        try {
            // 1. 点击获取浮窗权限按钮
            console.log("\n1️⃣ Clicking overlay permission button...");
            const { x, y } = config_1.default.ui.coordinates.overlayPermissionButton;
            console.log(`   Using coordinates from config: (${x}, ${y})`);
            await this.clickElement(x, y);
            await new Promise(resolve => setTimeout(resolve, 3000));
            // 2. 验证是否进入系统设置页面
            console.log("\n2️⃣ Verifying system settings page...");
            let settingsPageFound = false;
            // 增加等待时间
            console.log("   Waiting for settings page to load...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            for (let i = 0; i < 5; i++) {
                try {
                    console.log(`   Attempt ${i + 1}/5 to verify settings page...`);
                    const dumpOutput = await this.dumpUI();
                    // 更灵活的验证条件
                    const settingsIndicators = [
                        "显示在其他应用上层",
                        "overlay",
                        "Draw over other apps",
                        "设置",
                        "Settings",
                        "应用",
                        "Apps",
                        "权限",
                        "Permissions"
                    ];
                    let foundIndicator = false;
                    for (const indicator of settingsIndicators) {
                        if (dumpOutput.includes(indicator)) {
                            console.log(`✅ System settings page confirmed (found: ${indicator})`);
                            foundIndicator = true;
                            settingsPageFound = true;
                            break;
                        }
                    }
                    if (foundIndicator) {
                        break;
                    }
                    else {
                        console.log("   ⚠️  Not in system settings page yet...");
                        console.log("   Trying to scroll to refresh...");
                        try {
                            (0, child_process_1.execSync)(`adb -s ${deviceId} shell input swipe 640 600 640 300 300`, { stdio: "pipe" });
                        }
                        catch (error) {
                            console.log("   ⚠️  Failed to scroll:", error instanceof Error ? error.message : String(error));
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                catch (error) {
                    console.log("   ⚠️  Failed to get UI dump:", error instanceof Error ? error.message : String(error));
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            if (!settingsPageFound) {
                console.log("   ⚠️  Strict verification failed, but continuing with process...");
                console.log("   Proceeding to search for app in current page...");
            }
            else {
                console.log("✅ System settings page verification completed");
            }
            // 3. 滚动并查找包含app名称的条目
            console.log("\n3️⃣ Searching for app in settings...");
            console.log(`🔍 Looking for app: ${appName} (package: ${packageName})`);
            let appEntryFound = false;
            const maxScrollAttempts = 10;
            for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
                try {
                    const dumpOutput = await this.dumpUI();
                    // 检查是否包含app名称或包名
                    if (dumpOutput.includes(appName) || dumpOutput.includes(packageName)) {
                        console.log("✅ Found app entry in settings");
                        appEntryFound = true;
                        // 4. 点击app条目
                        console.log("\n4️⃣ Clicking app entry...");
                        // 尝试不同的点击位置
                        const clickPositions = [
                            [320, 300], // 标准位置
                            [320, 400], // 备选位置1
                            [320, 500], // 备选位置2
                            [320, 600], // 备选位置3
                            [400, 450], // 备选位置4
                            [500, 500] // 备选位置5
                        ];
                        let appClicked = false;
                        for (const [x, y] of clickPositions) {
                            try {
                                console.log(`\n   Trying click at (${x}, ${y})...`);
                                await this.clickElement(x, y);
                                appClicked = true;
                                console.log("✅ App entry clicked successfully");
                                break;
                            }
                            catch (error) {
                                console.log(`   ⚠️  Failed to click at (${x}, ${y}):`, error instanceof Error ? error.message : String(error));
                            }
                        }
                        if (!appClicked) {
                            throw new Error("Failed to click app entry in settings");
                        }
                        // 5. 等待app-specific设置页面加载
                        console.log("\n5️⃣ Waiting for app-specific settings page...");
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        // 验证是否进入app-specific设置页面
                        let appSettingsPageFound = false;
                        for (let i = 0; i < 3; i++) {
                            try {
                                const dumpOutput = await this.dumpUI();
                                if (dumpOutput.includes(appName) || dumpOutput.includes("允许显示在其他应用上层")) {
                                    console.log("✅ App-specific settings page confirmed");
                                    appSettingsPageFound = true;
                                    break;
                                }
                                else {
                                    console.log("⚠️  Not in app settings page, waiting...");
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                            catch (error) {
                                console.log("⚠️  Failed to get UI dump:", error instanceof Error ? error.message : String(error));
                            }
                        }
                        if (!appSettingsPageFound) {
                            throw new Error("Failed to navigate to app-specific settings page");
                        }
                        break;
                    }
                    else {
                        console.log(`\n   App not found in current view (attempt ${scrollAttempt + 1}/${maxScrollAttempts})`);
                        // 滚动屏幕
                        console.log("   Scrolling down...");
                        try {
                            (0, child_process_1.execSync)(`adb -s ${deviceId} shell input swipe 640 600 640 300 500`, { stdio: "pipe" });
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                        catch (error) {
                            console.log("   ⚠️  Failed to scroll:", error instanceof Error ? error.message : String(error));
                        }
                    }
                }
                catch (error) {
                    console.log(`⚠️  Error during app search:`, error instanceof Error ? error.message : String(error));
                }
            }
            if (!appEntryFound) {
                throw new Error(`Failed to find app entry for ${appName} in overlay permission settings`);
            }
            // 6. 点击允许按钮
            console.log("\n6️⃣ Clicking allow button...");
            const allowButtonPositions = [
                [960, 540], // 标准位置
                [1000, 500], // 备选位置1
                [900, 580], // 备选位置2
                [800, 600], // 备选位置3
                [700, 500], // 备选位置4
                [600, 400], // 备选位置5
                [800, 450] // 备选位置6
            ];
            let allowButtonClicked = false;
            for (const [x, y] of allowButtonPositions) {
                try {
                    console.log(`\n   Trying allow button at (${x}, ${y})...`);
                    await this.clickElement(x, y);
                    allowButtonClicked = true;
                    console.log("✅ Allow button clicked successfully");
                    break;
                }
                catch (error) {
                    console.log(`   ⚠️  Failed to click at (${x}, ${y}):`, error instanceof Error ? error.message : String(error));
                }
            }
            if (!allowButtonClicked) {
                throw new Error("Failed to click allow button in overlay permission settings");
            }
            // 7. 等待并返回应用
            console.log("\n7️⃣ Returning to app...");
            await new Promise(resolve => setTimeout(resolve, 2000));
            // 尝试返回应用（多次返回以确保退出设置页面）
            console.log("\n8️⃣ Trying to return to app...");
            for (let i = 0; i < 5; i++) {
                try {
                    (0, child_process_1.execSync)(`adb -s ${deviceId} shell input keyevent 4`, { stdio: "pipe" });
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
                catch (error) {
                    console.log(`⚠️  Failed to send back key:`, error instanceof Error ? error.message : String(error));
                }
            }
            // 9. 验证是否返回应用
            console.log("\n9️⃣ Verifying return to app...");
            let appReturned = false;
            for (let i = 0; i < 3; i++) {
                try {
                    const dumpOutput = await this.dumpUI();
                    if (dumpOutput.includes("WMMT 远程控制器")) {
                        console.log("✅ Successfully returned to app");
                        appReturned = true;
                        break;
                    }
                    else {
                        console.log("⚠️  Not back to app yet, waiting...");
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                catch (error) {
                    console.log("⚠️  Failed to get UI dump:", error instanceof Error ? error.message : String(error));
                }
            }
            if (!appReturned) {
                // 尝试重新启动应用
                console.log("🔄 Trying to restart app...");
                (0, child_process_1.execSync)(`adb -s ${deviceId} shell am start -n ${packageName}/.MainActivity`, { stdio: "pipe" });
                await new Promise(resolve => setTimeout(resolve, 3000));
                // 再次验证
                try {
                    const dumpOutput = await this.dumpUI();
                    if (dumpOutput.includes("WMMT 远程控制器")) {
                        console.log("✅ App restarted successfully");
                        appReturned = true;
                    }
                    else {
                        throw new Error("Failed to return to app after permission grant");
                    }
                }
                catch (error) {
                    throw new Error("Failed to verify app return after restart: " + (error instanceof Error ? error.message : String(error)));
                }
            }
            console.log("\n✅ Overlay permission request completed with strict verification");
            return true;
        }
        catch (error) {
            console.error("❌ Overlay permission request failed:", error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    async checkOverlayPermission() {
        console.log("📱 Checking overlay permission status...");
        const deviceId = this.deviceManager.getDeviceId();
        const packageName = "com.linecat.wmmtcontroller";
        if (!deviceId) {
            throw new Error("Device ID not available");
        }
        try {
            // 尝试多种方法检查权限
            const checkMethods = [
                {
                    name: "settings get secure overlay_apps",
                    command: `adb -s ${deviceId} shell settings get secure overlay_apps`,
                    check: (output) => output.includes(packageName)
                },
                {
                    name: "dumpsys package (check overlay)",
                    command: `adb -s ${deviceId} shell dumpsys package ${packageName}`,
                    check: (output) => output.includes("android.permission.SYSTEM_ALERT_WINDOW") && (output.includes("granted=true") || output.includes("granted") || output.includes("allowed=true"))
                },
                {
                    name: "appops check",
                    command: `adb -s ${deviceId} shell appops get ${packageName} SYSTEM_ALERT_WINDOW`,
                    check: (output) => output.includes("allow") || output.includes("granted")
                },
                {
                    name: "settings get secure enabled_accessibility_services",
                    command: `adb -s ${deviceId} shell settings get secure enabled_accessibility_services`,
                    check: (output) => output.includes(packageName)
                }
            ];
            let hasPermission = false;
            let lastError = null;
            for (const method of checkMethods) {
                try {
                    console.log(`   Trying ${method.name}...`);
                    const output = (0, child_process_1.execSync)(method.command, { stdio: "pipe", encoding: "utf8" });
                    if (method.check(output)) {
                        console.log(`   ✅ Permission granted (via ${method.name})`);
                        hasPermission = true;
                        break;
                    }
                    else {
                        console.log(`   ⚠️  Permission not granted (via ${method.name})`);
                    }
                }
                catch (error) {
                    console.log(`   ⚠️  Failed ${method.name}:`, error instanceof Error ? error.message : String(error));
                    lastError = error;
                }
            }
            // 额外尝试：直接检查设置值
            try {
                console.log("   Trying direct settings check...");
                const settingsOutput = (0, child_process_1.execSync)(`adb -s ${deviceId} shell settings list secure`, { stdio: "pipe", encoding: "utf8" });
                if (settingsOutput.includes(`overlay_apps=${packageName}`) || settingsOutput.includes(`overlay_apps=${packageName}`)) {
                    console.log("   ✅ Permission granted (via direct settings check)");
                    hasPermission = true;
                }
            }
            catch (error) {
                console.log("   ⚠️  Failed direct settings check:", error instanceof Error ? error.message : String(error));
            }
            console.log(`✅ Final overlay permission status: ${hasPermission ? "Granted" : "Not granted"}`);
            return hasPermission;
        }
        catch (error) {
            console.log("⚠️  Failed to check overlay permission:", error instanceof Error ? error.message : String(error));
            return false;
        }
    }
}
exports.default = UIInteractor;
