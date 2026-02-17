const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config");
const { log } = require("./utils");

async function buildAndroid() {
    log("🔨 Building Android app...");
    const buildStart = Date.now();

    const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
    
    execSync(`${gradlew} assembleDebug`, {
        cwd: CONFIG.androidProjectPath,
        encoding: "utf8",
        stdio: "inherit",
        timeout: 300000,
        env: { ...process.env }
    });

    if (!fs.existsSync(CONFIG.apkOutputPath)) {
        throw new Error(`Android build failed: ${CONFIG.apkOutputPath} not found`);
    }

    log(`✅ Android app built (${Date.now() - buildStart}ms)`);
}

module.exports = {
    buildAndroid
};
