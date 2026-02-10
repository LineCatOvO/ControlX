import { execSync } from "child_process";
import fs from "fs";
import config from "./config";

function buildAndroidApp(): void {
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
        throw new Error(`Android build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function getApkPath(): string {
    return config.android.apkPath;
}

function verifyApkExists(): string {
    const apkPath = config.android.apkPath;
    if (!fs.existsSync(apkPath)) {
        throw new Error(`APK file not found at ${apkPath}`);
    }
    return apkPath;
}

export {
    buildAndroidApp,
    getApkPath,
    verifyApkExists
};