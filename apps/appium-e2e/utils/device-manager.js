const { execSync } = require("child_process");

class DeviceManager {
    constructor() {
        this.deviceId = null;
    }

    async getAvailableDevice() {
        try {
            const devicesOutput = execSync("adb devices", { encoding: "utf8" });
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
        } catch (error) {
            throw new Error(`Failed to get available device: ${error.message}`);
        }
    }

    getDeviceId() {
        return this.deviceId;
    }
}

module.exports = DeviceManager;
