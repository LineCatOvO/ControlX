import { execSync } from "child_process";

class DeviceManager {
    private deviceId: string | null = null;

    async getAvailableDevice(): Promise<string> {
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
            throw new Error(`Failed to get available device: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    getDeviceId(): string | null {
        return this.deviceId;
    }
}

export default DeviceManager;