"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wd_1 = __importDefault(require("wd"));
const fs_1 = __importDefault(require("fs"));
class DeviceHelper {
    constructor() {
        this.driver = null;
    }
    // Initialize Appium driver
    async initDriver(capabilities = {}) {
        const defaultCapabilities = {
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            app: "./android/WMMTController.apk",
            noReset: false,
            unicodeKeyboard: true,
            resetKeyboard: true,
        };
        const finalCapabilities = { ...defaultCapabilities, ...capabilities };
        this.driver = wd_1.default.promiseChainRemote("localhost", 4723);
        try {
            await this.driver.init(finalCapabilities);
            console.log("Appium driver initialized successfully");
            return this.driver;
        }
        catch (error) {
            throw new Error(`Failed to initialize Appium driver: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Quit driver
    async quit() {
        if (this.driver) {
            try {
                await this.driver.quit();
                console.log("Appium driver quit successfully");
            }
            catch (error) {
                console.error(`Error quitting driver: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    // Wait for element to be visible
    async waitForElement(locator, timeout = 10000) {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }
        try {
            await this.driver.waitForElementByAccessibilityId(locator, timeout);
            return await this.driver.elementByAccessibilityId(locator);
        }
        catch (error) {
            throw new Error(`Element '${locator}' not found within ${timeout}ms: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Tap element by accessibility ID
    async tapElement(locator) {
        try {
            const element = await this.waitForElement(locator);
            await element.click();
            console.log(`Tapped element: ${locator}`);
        }
        catch (error) {
            throw new Error(`Failed to tap element '${locator}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Type text into element
    async typeText(locator, text) {
        try {
            const element = await this.waitForElement(locator);
            await element.sendKeys(text);
            console.log(`Typed text '${text}' into element: ${locator}`);
        }
        catch (error) {
            throw new Error(`Failed to type text into element '${locator}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Get element text
    async getElementText(locator) {
        try {
            const element = await this.waitForElement(locator);
            const text = await element.text();
            console.log(`Element '${locator}' text: ${text}`);
            return text;
        }
        catch (error) {
            throw new Error(`Failed to get text from element '${locator}': ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Check if element exists
    async elementExists(locator) {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }
        try {
            await this.driver.elementByAccessibilityId(locator);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // Take screenshot
    async takeScreenshot(filename) {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }
        try {
            const screenshot = await this.driver.takeScreenshot();
            // Ensure screenshots directory exists
            const screenshotsDir = "./screenshots";
            if (!fs_1.default.existsSync(screenshotsDir)) {
                fs_1.default.mkdirSync(screenshotsDir, { recursive: true });
            }
            fs_1.default.writeFileSync(`${screenshotsDir}/${filename}`, screenshot, "base64");
            console.log(`Screenshot saved: ${filename}`);
        }
        catch (error) {
            console.error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Swipe gesture
    async swipe(startX, startY, endX, endY, duration = 1000) {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }
        try {
            await this.driver.swipe({ startX, startY, endX, endY, duration });
            console.log(`Swiped from (${startX},${startY}) to (${endX},${endY})`);
        }
        catch (error) {
            throw new Error(`Swipe failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Wait for specific time
    async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.default = new DeviceHelper();
