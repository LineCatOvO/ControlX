const backendManager = require("./backend-manager");
const androidBuilder = require("./android-builder");
const deviceManager = require("./device-manager");
const uiTester = require("./ui-tester");
const config = require("./config");

async function runAppiumTest() {
    console.log("🧪 Starting Appium E2E test...");
    
    const apkPath = androidBuilder.verifyApkExists();
    const deviceId = config.device.id;
    const backendPort = backendManager.getBackendPort();
    
    console.log(`📱 Using APK: ${apkPath}`);
    console.log(`📱 Using device: ${deviceId}`);
    console.log(`🔌 Backend running on port: ${backendPort}`);
    
    try {
        deviceManager.verifyDeviceConnection(deviceId);
        
        deviceManager.uninstallApp(deviceId);
        
        deviceManager.installApp(apkPath, deviceId);
        
        deviceManager.startApp(deviceId);
        
        await deviceManager.waitForAppInitialization();
        
        deviceManager.verifyAppProcess(deviceId);
        
        const dumpOutput = deviceManager.dumpUI(deviceId);
        uiTester.checkUIElements(dumpOutput);
        
        await uiTester.testBasicFunctionality(deviceManager, deviceId);
        
        await uiTester.testOverlayPermissionFlow(deviceManager, deviceId);
        
        uiTester.printTestSummary(backendPort);
        
        return true;
    } catch (error) {
        console.log("\n❌ APPIUM E2E TEST FAILED");
        console.log("   Error:", error.message);
        throw error;
    }
}

async function runRealE2ETest() {
    console.log("🧪 Starting REAL End-to-End Test");
    console.log("=================================");
    
    try {
        const port = await backendManager.startBackend();
        
        androidBuilder.buildAndroidApp();
        
        await runAppiumTest();
        
        console.log("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!");
        return true;
    } catch (error) {
        console.log("\n❌ TEST FAILED");
        console.log("   Error:", error.message);
        console.log("   Stack:", error.stack);
        return false;
    } finally {
        backendManager.stopBackend();
    }
}

process.on('exit', backendManager.stopBackend);
process.on('SIGINT', () => {
    backendManager.stopBackend();
    process.exit(0);
});
process.on('SIGTERM', () => {
    backendManager.stopBackend();
    process.exit(0);
});

runRealE2ETest()
    .then((success) => {
        console.log(`\n🏁 Test execution finished with status: ${success ? "SUCCESS" : "FAILURE"}`);
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.log("\n💥 Test execution crashed:", error.message);
        backendManager.stopBackend();
        process.exit(1);
    });
