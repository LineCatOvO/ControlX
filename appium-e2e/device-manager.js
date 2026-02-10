const { execSync } = require("child_process");
const config = require("./config");

function verifyDeviceConnection(deviceId = config.device.id) {
    console.log(`\n1️⃣ Verifying device connection...`);
    const devicesOutput = execSync("adb devices", { encoding: "utf8" });
    if (!devicesOutput.includes(deviceId)) {
        throw new Error(`Device ${deviceId} not found in adb devices`);
    }
    console.log(`✅ Device ${deviceId} is connected`);
}

function uninstallApp(deviceId = config.device.id) {
    console.log(`\n2️⃣ Uninstalling previous app version...`);
    try {
        execSync(`adb -s ${deviceId} uninstall ${config.android.packageName}`, { stdio: "pipe" });
        console.log("✅ Previous app version uninstalled");
    } catch (error) {
        console.log("ℹ️  No previous app version found or uninstall failed");
    }
}

function installApp(apkPath, deviceId = config.device.id) {
    console.log(`\n3️⃣ Installing new app version...`);
    const installResult = execSync(`adb -s ${deviceId} install -r "${apkPath}"`, {
        stdio: "pipe",
        encoding: "utf8"
    });
    if (installResult.includes("Success")) {
        console.log("✅ App installed successfully");
    } else {
        throw new Error(`App installation failed: ${installResult}`);
    }
}

function startApp(deviceId = config.device.id) {
    console.log(`\n4️⃣ Starting application...`);
    execSync(`adb -s ${deviceId} shell am start -n ${config.android.mainActivity}`, { stdio: "pipe" });
    console.log("✅ Application started");
}

async function waitForAppInitialization() {
    console.log(`\n5️⃣ Waiting for app to initialize...`);
    await new Promise(resolve => setTimeout(resolve, config.timeouts.appInit));
}

function verifyAppProcess(deviceId = config.device.id) {
    console.log(`\n6️⃣ Verifying app process...`);
    try {
        const psOutput = execSync(`adb -s ${deviceId} shell ps`, {
            stdio: "pipe",
            encoding: "utf8"
        });
        
        if (psOutput && psOutput.includes(config.android.processName)) {
            console.log("✅ App process is running");
        } else {
            console.log("⚠️  App process not found in ps output");
        }
    } catch (error) {
        console.log("⚠️  Process verification failed:", error.message);
    }
}

function dumpUI(deviceId = config.device.id) {
    return execSync(
        `adb -s ${deviceId} shell uiautomator dump && adb -s ${deviceId} shell cat /sdcard/window_dump.xml`,
        { stdio: "pipe", encoding: "utf8" }
    );
}

function tapAt(x, y, deviceId = config.device.id) {
    execSync(`adb -s ${deviceId} shell input tap ${x} ${y}`, { stdio: "pipe" });
}

function pressBack(deviceId = config.device.id) {
    execSync(`adb -s ${deviceId} shell input keyevent KEYCODE_BACK`, { stdio: "pipe" });
}

module.exports = {
    verifyDeviceConnection,
    uninstallApp,
    installApp,
    startApp,
    waitForAppInitialization,
    verifyAppProcess,
    dumpUI,
    tapAt,
    pressBack
};
