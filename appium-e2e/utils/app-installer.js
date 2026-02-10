const { execSync } = require("child_process");
const fs = require("fs");

class AppInstaller {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        this.packageName = "com.linecat.wmmtcontroller";
    }

    async install(apkPath) {
        console.log("📱 Installing Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        if (!fs.existsSync(apkPath)) {
            throw new Error(`APK file not found at ${apkPath}`);
        }
        
        try {
            console.log(`📱 Using APK: ${apkPath}`);
            console.log(`📱 Using device: ${deviceId}`);
            
            console.log("\n1️⃣ Verifying device connection...");
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
            if (!devicesOutput.includes(deviceId)) {
                throw new Error(`Device ${deviceId} not found in adb devices`);
            }
            console.log(`✅ Device ${deviceId} is connected`);
            
            console.log("\n2️⃣ Uninstalling previous app version...");
            try {
                execSync(`adb -s ${deviceId} uninstall ${this.packageName}`, { stdio: "pipe" });
                console.log("✅ Previous app version uninstalled");
            } catch (error) {
                console.log("ℹ️  No previous app version found or uninstall failed");
            }
            
            console.log("\n3️⃣ Installing new app version...");
            const installResult = execSync(`adb -s ${deviceId} install -r "${apkPath}"`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            if (installResult.includes("Success")) {
                console.log("✅ App installed successfully");
            } else {
                throw new Error(`App installation failed: ${installResult}`);
            }
            
            return true;
        } catch (error) {
            throw new Error(`App installation failed: ${error.message}`);
        }
    }

    async launch() {
        console.log("📱 Launching Android app...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            console.log("\n4️⃣ Starting application...");
            execSync(`adb -s ${deviceId} shell am start -n ${this.packageName}/.MainActivity`, { 
                stdio: "pipe" 
            });
            console.log("✅ Application started");
            
            console.log("\n5️⃣ Waiting for app to initialize...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return true;
        } catch (error) {
            throw new Error(`App launch failed: ${error.message}`);
        }
    }

    async verifyRunning() {
        console.log("📱 Verifying app is running...");
        
        const deviceId = this.deviceManager.getDeviceId();
        
        try {
            console.log("\n6️⃣ Verifying app process...");
            const psOutput = execSync(`adb -s ${deviceId} shell ps`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            
            if (psOutput && psOutput.includes("wmmtcontroller")) {
                console.log("✅ App process is running");
                return true;
            } else {
                console.log("⚠️  App process not found in ps output");
                return false;
            }
        } catch (error) {
            console.log("⚠️  Process verification failed:", error.message);
            return false;
        }
    }
}

module.exports = AppInstaller;
