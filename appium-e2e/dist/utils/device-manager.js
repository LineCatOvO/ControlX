"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
class DeviceManager {
    constructor() {
        this.deviceId = null;
    }
    async getAvailableDevice() {
        try {
            const devicesOutput = (0, child_process_1.execSync)("adb devices", { encoding: "utf8" });
            const lines = devicesOutput.split('\n')
                .filter(line => line.trim() !== '' && !line.includes('List of devices'));
            for (const line of lines) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2 && parts[1] === 'device') {
                    this.deviceId = parts[0];
                    return this.deviceId;
                }
            }
            throw new Error("No available device found");
        }
        catch (error) {
            throw new Error(`Failed to get available device: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    getDeviceId() {
        return this.deviceId;
    }
}
exports.default = DeviceManager;
