import { execSync } from "child_process";
import fs from "fs";
import path from "path";

interface LayoutElement {
    id: string;
    type: "button" | "text" | "input" | "switch" | "slider" | "container";
    bounds: { left: number; top: number; right: number; bottom: number };
    text?: string;
    clickable: boolean;
    visible: boolean;
    enabled: boolean;
}

interface LayoutScheme {
    version: string;
    elements: {
        [key: string]: {
            type: string;
            defaultBounds: { x: number; y: number; width: number; height: number };
            actions?: string[];
        };
    };
}

interface InteractionResult {
    success: boolean;
    elementId: string;
    action: string;
    timestamp: string;
    beforeState?: any;
    afterState?: any;
    error?: string;
}

interface DeviceManager {
    getDeviceId(): string | null;
}

class LayoutInteractor {
    private deviceManager: DeviceManager;
    private layoutScheme: LayoutScheme | null = null;
    private cachedElements: Map<string, LayoutElement> = new Map();
    private interactionLog: InteractionResult[] = [];

    constructor(deviceManager: DeviceManager) {
        this.deviceManager = deviceManager;
    }

    async loadLayoutScheme(schemePath?: string): Promise<LayoutScheme> {
        console.log("\n📐 Loading Layout Scheme");
        console.log("=".repeat(60));

        const defaultPath = path.join(__dirname, "..", "..", "AndroidClient", "app", "src", "main", "assets", "LayoutScheme.json");
        const filePath = schemePath || defaultPath;

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            this.layoutScheme = JSON.parse(content);
            console.log(`✅ Layout scheme loaded from: ${filePath}`);
            console.log(`   Version: ${this.layoutScheme?.version}`);
            console.log(`   Elements: ${Object.keys(this.layoutScheme?.elements || {}).length}`);
        } else {
            console.log(`⚠️  Layout scheme file not found: ${filePath}`);
            console.log("   Using default layout scheme");
            this.layoutScheme = this.getDefaultLayoutScheme();
        }

        return this.layoutScheme!;
    }

    private getDefaultLayoutScheme(): LayoutScheme {
        return {
            version: "1.0.0",
            elements: {
                "title_text": {
                    type: "text",
                    defaultBounds: { x: 0, y: 50, width: 1280, height: 80 }
                },
                "status_text": {
                    type: "text",
                    defaultBounds: { x: 0, y: 150, width: 1280, height: 60 }
                },
                "btn_start_service": {
                    type: "button",
                    defaultBounds: { x: 100, y: 400, width: 300, height: 120 },
                    actions: ["click"]
                },
                "btn_stop_service": {
                    type: "button",
                    defaultBounds: { x: 880, y: 400, width: 300, height: 120 },
                    actions: ["click"]
                },
                "btn_overlay_permission": {
                    type: "button",
                    defaultBounds: { x: 100, y: 600, width: 500, height: 80 },
                    actions: ["click"]
                },
                "hint_text": {
                    type: "text",
                    defaultBounds: { x: 0, y: 800, width: 1280, height: 60 }
                }
            }
        };
    }

    async dumpUI(): Promise<string> {
        const deviceId = this.deviceManager.getDeviceId();
        if (!deviceId) {
            throw new Error("Device ID not available");
        }

        try {
            execSync(`adb -s ${deviceId} shell uiautomator dump`, { stdio: "pipe" });
            const dumpOutput = execSync(`adb -s ${deviceId} shell cat /sdcard/window_dump.xml`, {
                stdio: "pipe",
                encoding: "utf8"
            });
            return dumpOutput;
        } catch (error) {
            throw new Error(`UI dump failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async parseUIElements(dumpOutput: string): Promise<LayoutElement[]> {
        const elements: LayoutElement[] = [];
        const nodeRegex = /<node[^>]*>/g;
        let match;

        while ((match = nodeRegex.exec(dumpOutput)) !== null) {
            const nodeStr = match[0];

            const boundsMatch = nodeStr.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
            const idMatch = nodeStr.match(/resource-id="([^"]*)"/);
            const textMatch = nodeStr.match(/text="([^"]*)"/);
            const classMatch = nodeStr.match(/class="([^"]*)"/);
            const clickableMatch = nodeStr.match(/clickable="([^"]*)"/);
            const visibleMatch = nodeStr.match(/displayed="([^"]*)"/);
            const enabledMatch = nodeStr.match(/enabled="([^"]*)"/);

            if (boundsMatch) {
                const element: LayoutElement = {
                    id: idMatch ? idMatch[1] : `anonymous_${elements.length}`,
                    type: this.getElementType(classMatch ? classMatch[1] : ""),
                    bounds: {
                        left: parseInt(boundsMatch[1]),
                        top: parseInt(boundsMatch[2]),
                        right: parseInt(boundsMatch[3]),
                        bottom: parseInt(boundsMatch[4])
                    },
                    text: textMatch ? textMatch[1] : undefined,
                    clickable: clickableMatch ? clickableMatch[1] === "true" : false,
                    visible: visibleMatch ? visibleMatch[1] === "true" : true,
                    enabled: enabledMatch ? enabledMatch[1] === "true" : true
                };

                elements.push(element);
                this.cachedElements.set(element.id, element);
            }
        }

        return elements;
    }

    private getElementType(className: string): LayoutElement["type"] {
        if (className.includes("Button")) return "button";
        if (className.includes("EditText")) return "input";
        if (className.includes("Switch")) return "switch";
        if (className.includes("SeekBar") || className.includes("Slider")) return "slider";
        if (className.includes("TextView")) return "text";
        return "container";
    }

    async findElement(elementId: string): Promise<LayoutElement | null> {
        const deviceId = this.deviceManager.getDeviceId();
        if (!deviceId) {
            throw new Error("Device ID not available");
        }

        const dumpOutput = await this.dumpUI();
        const elements = await this.parseUIElements(dumpOutput);

        return elements.find(e => e.id.includes(elementId) || e.id === elementId) || null;
    }

    async clickElement(elementId: string): Promise<InteractionResult> {
        const deviceId = this.deviceManager.getDeviceId();
        const timestamp = new Date().toISOString();

        if (!deviceId) {
            return {
                success: false,
                elementId,
                action: "click",
                timestamp,
                error: "Device ID not available"
            };
        }

        try {
            let element = await this.findElement(elementId);

            if (!element && this.layoutScheme?.elements[elementId]) {
                const schemeElement = this.layoutScheme.elements[elementId];
                const bounds = schemeElement.defaultBounds;
                const centerX = bounds.x + bounds.width / 2;
                const centerY = bounds.y + bounds.height / 2;

                console.log(`📍 Using scheme coordinates for ${elementId}: (${centerX}, ${centerY})`);
                execSync(`adb -s ${deviceId} shell input tap ${centerX} ${centerY}`, { stdio: "pipe" });

                const result: InteractionResult = {
                    success: true,
                    elementId,
                    action: "click",
                    timestamp,
                    beforeState: { source: "scheme" },
                    afterState: { clicked: true }
                };

                this.interactionLog.push(result);
                return result;
            }

            if (!element) {
                return {
                    success: false,
                    elementId,
                    action: "click",
                    timestamp,
                    error: `Element not found: ${elementId}`
                };
            }

            const centerX = (element.bounds.left + element.bounds.right) / 2;
            const centerY = (element.bounds.top + element.bounds.bottom) / 2;

            console.log(`📍 Clicking element ${elementId} at (${centerX}, ${centerY})`);
            execSync(`adb -s ${deviceId} shell input tap ${centerX} ${centerY}`, { stdio: "pipe" });

            const result: InteractionResult = {
                success: true,
                elementId,
                action: "click",
                timestamp,
                beforeState: { element },
                afterState: { clicked: true }
            };

            this.interactionLog.push(result);
            return result;
        } catch (error) {
            const result: InteractionResult = {
                success: false,
                elementId,
                action: "click",
                timestamp,
                error: error instanceof Error ? error.message : String(error)
            };

            this.interactionLog.push(result);
            return result;
        }
    }

    async longPressElement(elementId: string, durationMs: number = 1000): Promise<InteractionResult> {
        const deviceId = this.deviceManager.getDeviceId();
        const timestamp = new Date().toISOString();

        if (!deviceId) {
            return {
                success: false,
                elementId,
                action: "longPress",
                timestamp,
                error: "Device ID not available"
            };
        }

        try {
            const element = await this.findElement(elementId);
            if (!element) {
                return {
                    success: false,
                    elementId,
                    action: "longPress",
                    timestamp,
                    error: `Element not found: ${elementId}`
                };
            }

            const centerX = (element.bounds.left + element.bounds.right) / 2;
            const centerY = (element.bounds.top + element.bounds.bottom) / 2;

            console.log(`📍 Long pressing element ${elementId} at (${centerX}, ${centerY}) for ${durationMs}ms`);
            execSync(`adb -s ${deviceId} shell input swipe ${centerX} ${centerY} ${centerX} ${centerY} ${durationMs}`, { stdio: "pipe" });

            const result: InteractionResult = {
                success: true,
                elementId,
                action: "longPress",
                timestamp,
                beforeState: { element },
                afterState: { longPressed: true, duration: durationMs }
            };

            this.interactionLog.push(result);
            return result;
        } catch (error) {
            const result: InteractionResult = {
                success: false,
                elementId,
                action: "longPress",
                timestamp,
                error: error instanceof Error ? error.message : String(error)
            };

            this.interactionLog.push(result);
            return result;
        }
    }

    async swipe(direction: "up" | "down" | "left" | "right", distance: number = 500): Promise<InteractionResult> {
        const deviceId = this.deviceManager.getDeviceId();
        const timestamp = new Date().toISOString();

        if (!deviceId) {
            return {
                success: false,
                elementId: "screen",
                action: "swipe",
                timestamp,
                error: "Device ID not available"
            };
        }

        try {
            const centerX = 640;
            const centerY = 540;

            let startX = centerX;
            let startY = centerY;
            let endX = centerX;
            let endY = centerY;

            switch (direction) {
                case "up":
                    startY = centerY + distance / 2;
                    endY = centerY - distance / 2;
                    break;
                case "down":
                    startY = centerY - distance / 2;
                    endY = centerY + distance / 2;
                    break;
                case "left":
                    startX = centerX + distance / 2;
                    endX = centerX - distance / 2;
                    break;
                case "right":
                    startX = centerX - distance / 2;
                    endX = centerX + distance / 2;
                    break;
            }

            console.log(`📍 Swiping ${direction}: (${startX}, ${startY}) -> (${endX}, ${endY})`);
            execSync(`adb -s ${deviceId} shell input swipe ${startX} ${startY} ${endX} ${endY} 300`, { stdio: "pipe" });

            const result: InteractionResult = {
                success: true,
                elementId: "screen",
                action: "swipe",
                timestamp,
                beforeState: { direction, distance },
                afterState: { swiped: true }
            };

            this.interactionLog.push(result);
            return result;
        } catch (error) {
            const result: InteractionResult = {
                success: false,
                elementId: "screen",
                action: "swipe",
                timestamp,
                error: error instanceof Error ? error.message : String(error)
            };

            this.interactionLog.push(result);
            return result;
        }
    }

    async inputText(text: string): Promise<InteractionResult> {
        const deviceId = this.deviceManager.getDeviceId();
        const timestamp = new Date().toISOString();

        if (!deviceId) {
            return {
                success: false,
                elementId: "keyboard",
                action: "inputText",
                timestamp,
                error: "Device ID not available"
            };
        }

        try {
            const escapedText = text.replace(/ /g, "%s").replace(/&/g, "\\&");
            execSync(`adb -s ${deviceId} shell input text "${escapedText}"`, { stdio: "pipe" });

            const result: InteractionResult = {
                success: true,
                elementId: "keyboard",
                action: "inputText",
                timestamp,
                beforeState: { text },
                afterState: { inputted: true }
            };

            this.interactionLog.push(result);
            return result;
        } catch (error) {
            const result: InteractionResult = {
                success: false,
                elementId: "keyboard",
                action: "inputText",
                timestamp,
                error: error instanceof Error ? error.message : String(error)
            };

            this.interactionLog.push(result);
            return result;
        }
    }

    async pressKey(keyCode: string): Promise<InteractionResult> {
        const deviceId = this.deviceManager.getDeviceId();
        const timestamp = new Date().toISOString();

        if (!deviceId) {
            return {
                success: false,
                elementId: "keyboard",
                action: "pressKey",
                timestamp,
                error: "Device ID not available"
            };
        }

        const keyMap: { [key: string]: number } = {
            "enter": 66,
            "back": 4,
            "home": 3,
            "menu": 82,
            "volume_up": 24,
            "volume_down": 25,
            "power": 26,
            "tab": 61,
            "delete": 67,
            "escape": 111
        };

        try {
            const code = keyMap[keyCode.toLowerCase()] || parseInt(keyCode);
            execSync(`adb -s ${deviceId} shell input keyevent ${code}`, { stdio: "pipe" });

            const result: InteractionResult = {
                success: true,
                elementId: "keyboard",
                action: "pressKey",
                timestamp,
                beforeState: { keyCode },
                afterState: { pressed: true }
            };

            this.interactionLog.push(result);
            return result;
        } catch (error) {
            const result: InteractionResult = {
                success: false,
                elementId: "keyboard",
                action: "pressKey",
                timestamp,
                error: error instanceof Error ? error.message : String(error)
            };

            this.interactionLog.push(result);
            return result;
        }
    }

    async verifyElementState(elementId: string, expectedState: Partial<LayoutElement>): Promise<boolean> {
        const element = await this.findElement(elementId);
        if (!element) {
            console.log(`❌ Element not found: ${elementId}`);
            return false;
        }

        let matches = true;

        if (expectedState.visible !== undefined && element.visible !== expectedState.visible) {
            console.log(`❌ Visibility mismatch for ${elementId}: expected ${expectedState.visible}, got ${element.visible}`);
            matches = false;
        }

        if (expectedState.enabled !== undefined && element.enabled !== expectedState.enabled) {
            console.log(`❌ Enabled state mismatch for ${elementId}: expected ${expectedState.enabled}, got ${element.enabled}`);
            matches = false;
        }

        if (expectedState.text !== undefined && element.text !== expectedState.text) {
            console.log(`❌ Text mismatch for ${elementId}: expected "${expectedState.text}", got "${element.text}"`);
            matches = false;
        }

        if (matches) {
            console.log(`✅ Element ${elementId} state verified`);
        }

        return matches;
    }

    async takeScreenshot(savePath: string): Promise<boolean> {
        const deviceId = this.deviceManager.getDeviceId();
        if (!deviceId) {
            console.log("❌ Device ID not available");
            return false;
        }

        try {
            execSync(`adb -s ${deviceId} shell screencap -p /sdcard/screenshot.png`, { stdio: "pipe" });
            execSync(`adb -s ${deviceId} pull /sdcard/screenshot.png "${savePath}"`, { stdio: "pipe" });
            console.log(`📸 Screenshot saved to: ${savePath}`);
            return true;
        } catch (error) {
            console.log(`❌ Screenshot failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    getInteractionLog(): InteractionResult[] {
        return [...this.interactionLog];
    }

    clearInteractionLog(): void {
        this.interactionLog = [];
    }

    printInteractionSummary(): void {
        console.log("\n" + "=".repeat(60));
        console.log("📊 INTERACTION SUMMARY");
        console.log("=".repeat(60));

        const successful = this.interactionLog.filter(r => r.success).length;
        const failed = this.interactionLog.filter(r => !r.success).length;

        console.log(`Total Interactions: ${this.interactionLog.length}`);
        console.log(`Successful: ${successful}`);
        console.log(`Failed: ${failed}`);
        console.log("-".repeat(60));

        for (const result of this.interactionLog) {
            const status = result.success ? "✅" : "❌";
            console.log(`${status} ${result.action} on ${result.elementId} at ${result.timestamp}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        }

        console.log("=".repeat(60));
    }
}

export {
    LayoutInteractor,
    LayoutElement,
    LayoutScheme,
    InteractionResult
};
