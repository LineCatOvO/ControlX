const wd = require("wd");

/**
 * 设备辅助类
 * 
 * 提供设备操作、坐标计算等功能
 * 
 * 坐标系统说明：
 * - 相对坐标：使用百分比表示（0.0 - 1.0），如 0.5 表示屏幕中心
 * - 绝对坐标：使用像素值表示，需要根据屏幕尺寸动态计算
 * - 推荐使用相对坐标，由 calculateCoordinates() 自动转换为绝对坐标
 */
class DeviceHelper {
    constructor() {
        this.driver = null;
        this.screenWidth = null;
        this.screenHeight = null;
    }

    /**
     * 获取屏幕尺寸
     * @returns {Promise<{width: number, height: number}>} 屏幕尺寸
     */
    async getScreenSize() {
        if (this.screenWidth && this.screenHeight) {
            return { width: this.screenWidth, height: this.screenHeight };
        }

        try {
            const windowSize = await this.driver.getWindowSize();
            this.screenWidth = windowSize.width;
            this.screenHeight = windowSize.height;
            console.log(`屏幕尺寸: ${this.screenWidth}x${this.screenHeight}`);
            return { width: this.screenWidth, height: this.screenHeight };
        } catch (error) {
            // 默认使用常见分辨率
            console.warn('无法获取屏幕尺寸，使用默认值 1080x1920');
            this.screenWidth = 1080;
            this.screenHeight = 1920;
            return { width: this.screenWidth, height: this.screenHeight };
        }
    }

    /**
     * 计算坐标 - 将相对坐标转换为绝对坐标
     * @param {number} xPercent - X 轴相对坐标（0.0 - 1.0）
     * @param {number} yPercent - Y 轴相对坐标（0.0 - 1.0）
     * @returns {Promise<{x: number, y: number}>} 绝对坐标
     */
    async calculateCoordinates(xPercent, yPercent) {
        const { width, height } = await this.getScreenSize();
        const x = Math.round(width * xPercent);
        const y = Math.round(height * yPercent);
        console.log(`坐标转换: (${xPercent}, ${yPercent}) -> (${x}, ${y})`);
        return { x, y };
    }

    /**
     * 计算触摸事件坐标
     * @param {Object} touchEvent - 触摸事件对象
     * @returns {Promise<{x: number, y: number}>} 绝对坐标
     */
    async calculateTouchCoordinates(touchEvent) {
        // 支持两种格式：相对坐标（xPercent/yPercent）和绝对坐标（x/y）
        if (touchEvent.xPercent !== undefined && touchEvent.yPercent !== undefined) {
            return await this.calculateCoordinates(touchEvent.xPercent, touchEvent.yPercent);
        } else if (touchEvent.x !== undefined && touchEvent.y !== undefined) {
            console.warn('使用硬编码坐标，建议改为相对坐标');
            return { x: touchEvent.x, y: touchEvent.y };
        } else {
            throw new Error('触摸事件缺少坐标信息，需要 xPercent/yPercent 或 x/y');
        }
    }

    /**
     * 计算滑动事件坐标
     * @param {Object} swipeEvent - 滑动事件对象
     * @returns {Promise<{startX: number, startY: number, endX: number, endY: number}>} 绝对坐标
     */
    async calculateSwipeCoordinates(swipeEvent) {
        const { width, height } = await this.getScreenSize();
        
        let startX, startY, endX, endY;
        
        // 支持相对坐标
        if (swipeEvent.startXPercent !== undefined) {
            startX = Math.round(width * swipeEvent.startXPercent);
        } else if (swipeEvent.startX !== undefined) {
            startX = swipeEvent.startX;
        } else {
            throw new Error('滑动事件缺少起始 X 坐标');
        }

        if (swipeEvent.startYPercent !== undefined) {
            startY = Math.round(height * swipeEvent.startYPercent);
        } else if (swipeEvent.startY !== undefined) {
            startY = swipeEvent.startY;
        } else {
            throw new Error('滑动事件缺少起始 Y 坐标');
        }

        if (swipeEvent.endXPercent !== undefined) {
            endX = Math.round(width * swipeEvent.endXPercent);
        } else if (swipeEvent.endX !== undefined) {
            endX = swipeEvent.endX;
        } else {
            throw new Error('滑动事件缺少结束 X 坐标');
        }

        if (swipeEvent.endYPercent !== undefined) {
            endY = Math.round(height * swipeEvent.endYPercent);
        } else if (swipeEvent.endY !== undefined) {
            endY = swipeEvent.endY;
        } else {
            throw new Error('滑动事件缺少结束 Y 坐标');
        }

        console.log(`滑动坐标: (${startX}, ${startY}) -> (${endX}, ${endY})`);
        return { startX, startY, endX, endY };
    }

    // Initialize Appium driver
    async initDriver(capabilities = {}) {
        const defaultCapabilities = {
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            app: "./android/ControlX.apk",
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
                `Failed to initialize Appium driver: ${error.message}`
            );
        }
    }

    // Quit driver
    async quit() {
        if (this.driver) {
            try {
                await this.driver.quit();
                console.log("Appium driver quit successfully");
            } catch (error) {
                console.error(`Error quitting driver: ${error.message}`);
            }
        }
    }

    // Wait for element to be visible
    async waitForElement(locator, timeout = 10000) {
        try {
            await this.driver.waitForElementByAccessibilityId(locator, timeout);
            return await this.driver.elementByAccessibilityId(locator);
        } catch (error) {
            throw new Error(
                `Element '${locator}' not found within ${timeout}ms: ${error.message}`
            );
        }
    }

    // Tap element by accessibility ID
    async tapElement(locator) {
        try {
            const element = await this.waitForElement(locator);
            await element.click();
            console.log(`Tapped element: ${locator}`);
        } catch (error) {
            throw new Error(
                `Failed to tap element '${locator}': ${error.message}`
            );
        }
    }

    // Type text into element
    async typeText(locator, text) {
        try {
            const element = await this.waitForElement(locator);
            await element.sendKeys(text);
            console.log(`Typed text '${text}' into element: ${locator}`);
        } catch (error) {
            throw new Error(
                `Failed to type text into element '${locator}': ${error.message}`
            );
        }
    }

    // Get element text
    async getElementText(locator) {
        try {
            const element = await this.waitForElement(locator);
            const text = await element.text();
            console.log(`Element '${locator}' text: ${text}`);
            return text;
        } catch (error) {
            throw new Error(
                `Failed to get text from element '${locator}': ${error.message}`
            );
        }
    }

    // Check if element exists
    async elementExists(locator) {
        try {
            await this.driver.elementByAccessibilityId(locator);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Take screenshot
    async takeScreenshot(filename) {
        try {
            const screenshot = await this.driver.takeScreenshot();
            require("fs").writeFileSync(
                `./screenshots/${filename}`,
                screenshot,
                "base64"
            );
            console.log(`Screenshot saved: ${filename}`);
        } catch (error) {
            console.error(`Failed to take screenshot: ${error.message}`);
        }
    }

    // Swipe gesture (支持相对坐标和绝对坐标)
    async swipe(startX, startY, endX, endY, duration = 1000) {
        try {
            // 如果坐标值在 0-1 之间，视为相对坐标
            const { width, height } = await this.getScreenSize();
            let actualStartX = startX <= 1 ? Math.round(width * startX) : startX;
            let actualStartY = startY <= 1 ? Math.round(height * startY) : startY;
            let actualEndX = endX <= 1 ? Math.round(width * endX) : endX;
            let actualEndY = endY <= 1 ? Math.round(height * endY) : endY;

            await this.driver.swipe({ 
                startX: actualStartX, 
                startY: actualStartY, 
                endX: actualEndX, 
                endY: actualEndY, 
                duration 
            });
            console.log(
                `Swiped from (${actualStartX},${actualStartY}) to (${actualEndX},${actualEndY})`
            );
        } catch (error) {
            throw new Error(`Swipe failed: ${error.message}`);
        }
    }

    // Swipe with event object (支持 test-data.json 中的事件格式)
    async swipeWithEvent(swipeEvent) {
        const { startX, startY, endX, endY } = await this.calculateSwipeCoordinates(swipeEvent);
        const duration = swipeEvent.duration || 1000;
        await this.swipe(startX, startY, endX, endY, duration);
    }

    // Tap at relative coordinates
    async tapAtPercent(xPercent, yPercent) {
        const { x, y } = await this.calculateCoordinates(xPercent, yPercent);
        await this.driver.performTouchAction({
            action: 'tap',
            options: { x, y }
        });
        console.log(`Tapped at (${x}, ${y}) [${xPercent * 100}%, ${yPercent * 100}%]`);
    }

    // Wait for specific time
    async sleep(ms) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = new DeviceHelper();
