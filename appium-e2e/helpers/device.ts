import wd from "wd";
import fs from "fs";

class DeviceHelper {
    private driver: wd.WebDriver | null = null;

    // Initialize Appium driver
    async initDriver(capabilities: any = {}): Promise<wd.WebDriver> {
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

        this.driver = wd.promiseChainRemote("localhost", 4723);

        try {
            await this.driver.init(finalCapabilities);
            console.log("Appium driver initialized successfully");
            return this.driver;
        } catch (error) {
            throw new Error(
                `Failed to initialize Appium driver: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // Quit driver
    async quit(): Promise<void> {
        if (this.driver) {
            try {
                await this.driver.quit();
                console.log("Appium driver quit successfully");
            } catch (error) {
                console.error(`Error quitting driver: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    // Wait for element to be visible
    async waitForElement(locator: string, timeout: number = 10000): Promise<wd.Element> {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }

        try {
            await this.driver.waitForElementByAccessibilityId(locator, timeout);
            return await this.driver.elementByAccessibilityId(locator);
        } catch (error) {
            throw new Error(
                `Element '${locator}' not found within ${timeout}ms: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // Tap element by accessibility ID
    async tapElement(locator: string): Promise<void> {
        try {
            const element = await this.waitForElement(locator);
            await element.click();
            console.log(`Tapped element: ${locator}`);
        } catch (error) {
            throw new Error(
                `Failed to tap element '${locator}': ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // Type text into element
    async typeText(locator: string, text: string): Promise<void> {
        try {
            const element = await this.waitForElement(locator);
            await element.sendKeys(text);
            console.log(`Typed text '${text}' into element: ${locator}`);
        } catch (error) {
            throw new Error(
                `Failed to type text into element '${locator}': ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // Get element text
    async getElementText(locator: string): Promise<string> {
        try {
            const element = await this.waitForElement(locator);
            const text = await element.text();
            console.log(`Element '${locator}' text: ${text}`);
            return text;
        } catch (error) {
            throw new Error(
                `Failed to get text from element '${locator}': ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    // Check if element exists
    async elementExists(locator: string): Promise<boolean> {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }

        try {
            await this.driver.elementByAccessibilityId(locator);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Take screenshot
    async takeScreenshot(filename: string): Promise<void> {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }

        try {
            const screenshot = await this.driver.takeScreenshot();
            
            // Ensure screenshots directory exists
            const screenshotsDir = "./screenshots";
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir, { recursive: true });
            }
            
            fs.writeFileSync(
                `${screenshotsDir}/${filename}`,
                screenshot,
                "base64"
            );
            console.log(`Screenshot saved: ${filename}`);
        } catch (error) {
            console.error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Swipe gesture
    async swipe(startX: number, startY: number, endX: number, endY: number, duration: number = 1000): Promise<void> {
        if (!this.driver) {
            throw new Error("Driver not initialized");
        }

        try {
            await this.driver.swipe({ startX, startY, endX, endY, duration });
            console.log(
                `Swiped from (${startX},${startY}) to (${endX},${endY})`
            );
        } catch (error) {
            throw new Error(`Swipe failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Wait for specific time
    async sleep(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}

export default new DeviceHelper();