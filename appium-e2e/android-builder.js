const { execSync } = require("child_process");
const fs = require("fs");
const config = require("./config");

function buildAndroidApp() {
    console.log("🔨 Building Android application...");
    
    const gradlePath = config.android.gradlePath;
    
    if (!fs.existsSync(gradlePath)) {
        throw new Error(`Gradle wrapper not found at ${gradlePath}`);
    }
    
    const buildCommand = `"${gradlePath}" ${config.android.buildCommand}`;
    
    try {
        execSync(buildCommand, {
            cwd: config.android.gradleCwd,
            stdio: "inherit",
            encoding: "utf8"
        });
        
        console.log("✅ Android application built successfully");
    } catch (error) {
        throw new Error(`Android build failed: ${error.message}`);
    }
}

function getApkPath() {
    return config.android.apkPath;
}

function verifyApkExists() {
    const apkPath = config.android.apkPath;
    if (!fs.existsSync(apkPath)) {
        throw new Error(`APK file not found at ${apkPath}`);
    }
    return apkPath;
}

module.exports = {
    buildAndroidApp,
    getApkPath,
    verifyApkExists
};
