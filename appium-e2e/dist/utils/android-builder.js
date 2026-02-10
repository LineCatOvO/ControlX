"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAndroidApp = buildAndroidApp;
exports.getApkPath = getApkPath;
exports.verifyApkExists = verifyApkExists;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
function buildAndroidApp() {
    console.log("🔨 Building Android application...");
    const gradlePath = config_1.default.android.gradlePath;
    if (!fs_1.default.existsSync(gradlePath)) {
        throw new Error(`Gradle wrapper not found at ${gradlePath}`);
    }
    const buildCommand = `"${gradlePath}" ${config_1.default.android.buildCommand}`;
    try {
        (0, child_process_1.execSync)(buildCommand, {
            cwd: config_1.default.android.gradleCwd,
            stdio: "inherit",
            encoding: "utf8"
        });
        console.log("✅ Android application built successfully");
    }
    catch (error) {
        throw new Error(`Android build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function getApkPath() {
    return config_1.default.android.apkPath;
}
function verifyApkExists() {
    const apkPath = config_1.default.android.apkPath;
    if (!fs_1.default.existsSync(apkPath)) {
        throw new Error(`APK file not found at ${apkPath}`);
    }
    return apkPath;
}
