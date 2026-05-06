/**
 * 键盘输入功能测试
 * 
 * 测试框架：Mocha + wd (Appium)
 * 
 * 测试场景：
 * 1. 单键按下/释放
 * 2. 多键组合
 * 3. 快速连击
 * 4. 长按
 * 5. 特殊键
 */

const wd = require("wd");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");

require("chai").use(chaiAsPromised);

// 配置
const CONFIG = {
    appiumHost: "localhost",
    appiumPort: 4723,
    packageName: "com.linecat.controlx",
    backendPort: null,
    wsClient: null,
    receivedInputs: []
};

// 测试数据
const KEYBOARD_SCENARIOS = require("../fixtures/input-scenarios.json").keyboard;

let driver = null;
let backendProcess = null;

describe("键盘输入功能测试", function() {
    // 增加超时时间
    this.timeout(60000);
    this.slow(10000);
    
    // 测试前置：启动后端并初始化
    before(async function() {
        console.log("🔧 启动测试环境...");
        
        // 启动后端
        const { spawn } = require("child_process");
        CONFIG.backendPort = 57128 + Math.floor(Math.random() * 1000);
        
        backendProcess = spawn("node", [
            path.join(__dirname, "..", "..", "Server", "dist", "app.js")
        ], {
            cwd: path.join(__dirname, "..", "..", "Server"),
            env: {
                ...process.env,
                TEST_MODE: "true",
                DISABLE_ACTUAL_INPUT: "true",
                PORT: CONFIG.backendPort.toString()
            }
        });
        
        // 等待后端启动
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 连接 WebSocket 并监听输入
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input") {
                    CONFIG.receivedInputs.push(msg.data);
                }
            } catch (e) {}
        });
        
        // 初始化 Appium 驱动
        driver = wd.promiseChainRemote(CONFIG.appiumHost, CONFIG.appiumPort);
        await driver.init({
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            appPackage: CONFIG.packageName,
            appActivity: `${CONFIG.packageName}/.MainActivity`,
            noReset: false,
            unicodeKeyboard: true,
            resetKeyboard: true
        });
        
        console.log("✅ 测试环境就绪");
    });
    
    // 测试后置：清理资源
    after(async function() {
        console.log("\n🧹 清理测试环境...");
        
        if (CONFIG.wsClient) {
            CONFIG.wsClient.close();
        }
        
        if (backendProcess) {
            backendProcess.kill("SIGTERM");
        }
        
        if (driver) {
            await driver.quit();
        }
        
        console.log("✅ 清理完成");
    });
    
    // 测试 1: 单键按下
    describe("单键测试", function() {
        it("应该能检测到单键按下 (W)", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            
            // 点击 W 键区域
            const { width, height } = await driver.getWindowSize();
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 200));
            
            // 验证后端收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            const keyboardInputs = newInputs.filter(i => i.keyboard && i.keyboard.length > 0);
            
            expect(keyboardInputs.length).to.be.greaterThan(0);
            
            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "keyboard-single-key.png"),
                screenshot,
                "base64"
            );
        });
    });
    
    // 测试 2: 多键组合
    describe("多键组合测试", function() {
        it("应该能处理多键组合 (W+A+S)", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();
            
            // 依次点击 W, A, S
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]); // W
            await new Promise(r => setTimeout(r, 100));
            await driver.tap([{ x: width * 0.15, y: height * 0.75 }]); // A
            await new Promise(r => setTimeout(r, 100));
            await driver.tap([{ x: width * 0.2, y: height * 0.8 }]); // S
            await new Promise(r => setTimeout(r, 300));
            
            // 验证
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            const keyboardInputs = newInputs.filter(i => i.keyboard);
            
            // 应该收到至少一个包含多个键的输入
            const multiKeyInputs = keyboardInputs.filter(i => i.keyboard.length >= 2);
            expect(multiKeyInputs.length).to.be.greaterThan(0);
        });
    });
    
    // 测试 3: 快速连击
    describe("快速连击测试", function() {
        it("应该能处理快速连击 (10 次/秒)", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();
            
            // 快速点击 10 次
            for (let i = 0; i < 10; i++) {
                await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
                await new Promise(r => setTimeout(r, 50));
            }
            
            await new Promise(r => setTimeout(r, 500));
            
            // 验证收到至少 8 次输入（允许 20% 丢失率）
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            const keyboardInputs = newInputs.filter(i => i.keyboard);
            
            expect(keyboardInputs.length).to.be.greaterThanOrEqual(8);
        });
    });
    
    // 测试 4: 长按
    describe("长按测试", function() {
        it("应该能处理长按 (2 秒)", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            
            // 使用 keycode 模拟长按
            await driver.pressKeyCode(33); // W 键的 keycode
            await new Promise(r => setTimeout(r, 2000));
            await driver.releaseKeyCode(33);
            
            await new Promise(r => setTimeout(r, 300));
            
            // 验证长按期间持续收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            const keyboardInputs = newInputs.filter(i => i.keyboard && i.keyboard.length > 0);
            
            // 2 秒内应该收到多个输入帧
            expect(keyboardInputs.length).to.be.greaterThan(1);
        });
    });
    
    // 测试 5: 特殊键
    describe("特殊键测试", function() {
        it("应该能处理方向键", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            
            // 模拟方向键按下
            const keyCodes = [19, 20, 21, 22]; // 上、下、左、右
            
            for (const keyCode of keyCodes) {
                await driver.pressKeyCode(keyCode);
                await new Promise(r => setTimeout(r, 100));
                await driver.releaseKeyCode(keyCode);
                await new Promise(r => setTimeout(r, 100));
            }
            
            // 验证
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            expect(newInputs.length).to.be.greaterThan(0);
        });
    });
    
    // 测试 6: 键盘布局验证
    describe("键盘布局测试", function() {
        it("应该包含 UI 元素", async function() {
            // 查找键盘区域
            const textViews = await driver.elements("class name", "android.widget.TextView");
            
            // 验证至少有一些文本元素（键位标签）
            expect(textViews.length).to.be.greaterThan(0);
            
            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "keyboard-layout.png"),
                screenshot,
                "base64"
            );
        });
    });
});
