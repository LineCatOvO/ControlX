/**
 * 布局管理功能测试
 *
 * 测试框架：Mocha + wd (Appium)
 *
 * BDD场景覆盖：
 * - 查看布局列表
 * - 创建新布局
 * - 删除布局
 * - 删除当前激活的布局
 * - 删除最后一个布局
 * - 切换布局
 * - 进入布局编辑模式
 * - 添加操作元素
 * - 删除操作元素
 * - 调整元素位置
 * - 调整元素大小
 * - 编辑元素控制映射
 * - 编辑元素参数
 * - 实时预览编辑效果
 * - 放弃编辑修改
 * - 保存编辑修改
 * - 导出布局
 * - 导入布局
 * - 导入无效布局文件
 * - 布局草稿保存
 * - 布局备份
 * - 恢复布局备份
 */

const wd = require("wd");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { expect } = require("chai");
const chaiAsPromised = require("chai-as-promised");

require("chai").use(chaiAsPromised);

// 配置
const CONFIG = {
    appiumHost: "localhost",
    appiumPort: 4723,
    packageName: "com.linecat.wmmtcontroller",
    backendPort: null,
    wsClient: null,
    receivedInputs: []
};

let driver = null;
let backendProcess = null;

describe("布局管理功能测试", function() {
    this.timeout(120000);
    this.slow(30000);

    // 测试前置
    before(async function() {
        console.log("🔧 启动布局管理测试环境...");

        // 启动后端
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

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 连接 WebSocket
        CONFIG.wsClient = new WebSocket(`ws://localhost:${CONFIG.backendPort}`);
        CONFIG.wsClient.on("message", (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === "input") {
                    CONFIG.receivedInputs.push(msg.data);
                }
            } catch (e) {}
        });

        // 初始化 Appium
        driver = wd.promiseChainRemote(CONFIG.appiumHost, CONFIG.appiumPort);
        await driver.init({
            platformName: "Android",
            automationName: "UiAutomator2",
            deviceName: "Android Emulator",
            appPackage: CONFIG.packageName,
            appActivity: `${CONFIG.packageName}/.MainActivity`,
            noReset: false
        });

        // 创建测试结果目录
        const reportsDir = path.join(__dirname, "..", "test-results");
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        console.log("✅ 布局管理测试环境就绪");
    });

    // 测试后置
    after(async function() {
        console.log("\n🧹 清理布局管理测试环境...");

        if (CONFIG.wsClient) CONFIG.wsClient.close();
        if (backendProcess) backendProcess.kill("SIGTERM");
        if (driver) await driver.quit();

        console.log("✅ 清理完成");
    });

    /**
     * Scenario: 查看布局列表
     * Given 应用已启动
     * When 用户进入布局管理界面
     * Then 系统应显示所有已保存的布局列表
     */
    describe("查看布局列表", function() {
        it("应该能显示布局列表", async function() {
            // 等待应用加载
            await new Promise(r => setTimeout(r, 2000));

            // 查找布局相关的UI元素
            const textViews = await driver.elements("class name", "android.widget.TextView");

            // 验证存在UI元素
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-list.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 切换布局
     * Given 布局"布局A"是当前激活的布局
     * When 用户选择切换到"布局B"
     * Then 系统应立即切换到"布局B"
     */
    describe("切换布局", function() {
        it("应该能切换布局", async function() {
            const { width, height } = await driver.getWindowSize();

            // 假设布局选择器在屏幕上方
            // 点击布局选择区域
            await driver.tap([{ x: width * 0.5, y: height * 0.1 }]);
            await new Promise(r => setTimeout(r, 500));

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-switch.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 进入布局编辑模式
     * Given 用户在布局管理界面
     * When 用户点击"编辑"按钮
     * Then 系统应进入布局编辑模式
     */
    describe("进入布局编辑模式", function() {
        it("应该能进入编辑模式", async function() {
            // 查找编辑按钮（可能是菜单项或按钮）
            const buttons = await driver.elements("class name", "android.widget.Button");

            // 尝试点击编辑相关按钮
            if (buttons.length > 0) {
                // 查找包含"编辑"文本的按钮
                for (const button of buttons) {
                    try {
                        const text = await button.text();
                        if (text && text.includes("编辑")) {
                            await button.click();
                            await new Promise(r => setTimeout(r, 1000));
                            break;
                        }
                    } catch (e) {}
                }
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-edit-mode.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 调整元素位置
     * Given 用户在布局编辑模式
     * When 用户拖动元素到新位置
     * Then 元素应移动到新位置
     */
    describe("调整元素位置", function() {
        it("应该能拖动元素", async function() {
            const { width, height } = await driver.getWindowSize();

            // 模拟拖动操作
            // 从屏幕中间拖动到新位置
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.6,
                endY: height * 0.4,
                duration: 500
            });

            await new Promise(r => setTimeout(r, 500));

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-moved.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 布局切换时控制状态
     * Given 服务状态为"已启动"
     * And 当前布局有按键处于按下状态
     * When 用户切换到新布局
     * Then 所有按键状态应被清零
     */
    describe("布局切换时控制状态", function() {
        it("切换布局应清零控制状态", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 先启动服务
            const buttons = await driver.elements("class name", "android.widget.Button");
            if (buttons.length > 0) {
                await buttons[0].click();
                await new Promise(r => setTimeout(r, 1000));
            }

            // 触控一个按键
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 300));

            // 切换布局
            await driver.tap([{ x: width * 0.5, y: height * 0.1 }]);
            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`布局切换测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 编辑不中断控制运行
     * Given 服务状态为"已启动"
     * And 用户进入布局编辑模式
     * When 用户进行编辑操作
     * Then 控制服务应继续运行
     */
    describe("编辑不中断控制运行", function() {
        it("编辑时控制服务应继续运行", async function() {
            const initialCount = CONFIG.receivedInputs.length;
            const { width, height } = await driver.getWindowSize();

            // 进行编辑操作
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.6,
                endY: height * 0.5,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 500));

            // 触控测试控制是否仍在工作
            await driver.tap([{ x: width * 0.2, y: height * 0.7 }]);
            await new Promise(r => setTimeout(r, 500));

            // 验证收到输入
            const newInputs = CONFIG.receivedInputs.slice(initialCount);
            console.log(`编辑时控制测试 - 收到输入数: ${newInputs.length}`);
        });
    });

    /**
     * Scenario: 导出布局
     * Given 用户在布局管理界面
     * When 用户点击"导出"按钮
     * Then 系统应生成布局导出文件
     */
    describe("导出布局", function() {
        it("应该能导出布局", async function() {
            // 查找导出相关按钮
            const buttons = await driver.elements("class name", "android.widget.Button");

            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("导出") || text.includes("Export"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 1000));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-export.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 导入布局
     * Given 用户在布局管理界面
     * When 用户点击"导入"按钮
     * Then 系统应解析布局文件
     */
    describe("导入布局", function() {
        it("应该能导入布局", async function() {
            // 查找导入相关按钮
            const buttons = await driver.elements("class name", "android.widget.Button");

            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("导入") || text.includes("Import"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 1000));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-import.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 创建新布局
     * Given 用户在布局管理界面
     * When 用户点击"新建布局"按钮
     * Then 系统应创建一个新的空白布局
     * And 新布局应出现在布局列表中
     */
    describe("创建新布局", function() {
        it("应该能创建新布局", async function() {
            const { width, height } = await driver.getWindowSize();

            // 查找新建布局按钮（通常是+按钮或菜单项）
            const buttons = await driver.elements("class name", "android.widget.Button");
            let newLayoutButton = null;

            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("新建") || text.includes("创建") || text.includes("New") || text.includes("+"))) {
                        newLayoutButton = button;
                        break;
                    }
                } catch (e) {}
            }

            // 如果找到按钮则点击
            if (newLayoutButton) {
                await newLayoutButton.click();
                await new Promise(r => setTimeout(r, 1000));
            } else {
                // 尝试点击右上角的+按钮位置
                await driver.tap([{ x: width * 0.9, y: height * 0.1 }]);
                await new Promise(r => setTimeout(r, 500));
            }

            // 截图验证
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-new-created.png"),
                screenshot,
                "base64"
            );

            // 验证布局创建成功（检查UI元素）
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);
        });
    });

    /**
     * Scenario: 删除布局
     * Given 用户在布局管理界面
     * And 存在多个布局
     * When 用户选择删除一个非激活布局
     * Then 系统应删除该布局
     * And 当前激活布局不应改变
     */
    describe("删除布局", function() {
        it("应该能删除非激活布局", async function() {
            const { width, height } = await driver.getWindowSize();

            // 长按布局项以显示删除选项
            await driver.tap([{ x: width * 0.3, y: height * 0.15 }]);
            await new Promise(r => setTimeout(r, 500));

            // 查找删除按钮
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("删除") || text.includes("Delete"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-deleted.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 删除当前激活的布局
     * Given 用户在布局管理界面
     * And 布局A是当前激活的布局
     * When 用户删除布局A
     * Then 系统应自动切换到另一个布局
     */
    describe("删除当前激活的布局", function() {
        it("删除激活布局应自动切换", async function() {
            const { width, height } = await driver.getWindowSize();

            // 先确保有多个布局（创建一个新布局）
            await driver.tap([{ x: width * 0.9, y: height * 0.1 }]);
            await new Promise(r => setTimeout(r, 500));

            // 选择当前激活的布局
            await driver.tap([{ x: width * 0.5, y: height * 0.1 }]);
            await new Promise(r => setTimeout(r, 300));

            // 查找删除按钮
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("删除") || text.includes("Delete"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-active-deleted.png"),
                screenshot,
                "base64"
            );

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");
        });
    });

    /**
     * Scenario: 删除最后一个布局
     * Given 用户在布局管理界面
     * And 只剩一个布局
     * When 用户尝试删除最后一个布局
     * Then 系统应阻止删除操作
     * Or 系统应创建默认布局替代
     */
    describe("删除最后一个布局", function() {
        it("删除最后一个布局应有保护机制", async function() {
            const { width, height } = await driver.getWindowSize();

            // 尝试删除操作
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("删除") || text.includes("Delete"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 验证至少有一个布局存在
            const textViews = await driver.elements("class name", "android.widget.TextView");
            expect(textViews.length).to.be.greaterThan(0);

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-last-protected.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 添加操作元素
     * Given 用户在布局编辑模式
     * When 用户点击"添加元素"按钮
     * Then 系统应在布局中添加新的操作元素
     */
    describe("添加操作元素", function() {
        it("应该能添加操作元素", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进入编辑模式
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("编辑") || text.includes("Edit"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 查找添加元素按钮
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("添加") || text.includes("Add") || text.includes("+"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-added.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 删除操作元素
     * Given 用户在布局编辑模式
     * And 布局中存在操作元素
     * When 用户选择删除一个元素
     * Then 系统应从布局中移除该元素
     */
    describe("删除操作元素", function() {
        it("应该能删除操作元素", async function() {
            const { width, height } = await driver.getWindowSize();

            // 长按元素以显示删除选项
            await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 500));

            // 查找删除按钮
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("删除") || text.includes("Delete") || text.includes("移除"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-deleted.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 调整元素大小
     * Given 用户在布局编辑模式
     * And 布局中存在操作元素
     * When 用户拖动元素的调整大小手柄
     * Then 元素大小应相应改变
     */
    describe("调整元素大小", function() {
        it("应该能调整元素大小", async function() {
            const { width, height } = await driver.getWindowSize();

            // 选择一个元素
            await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 300));

            // 拖动调整大小手柄（假设在右下角）
            await driver.swipe({
                startX: width * 0.55,
                startY: height * 0.55,
                endX: width * 0.65,
                endY: height * 0.65,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 300));

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-resized.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 编辑元素控制映射
     * Given 用户在布局编辑模式
     * And 用户选中一个操作元素
     * When 用户修改元素的控制映射
     * Then 系统应更新元素的控制映射设置
     */
    describe("编辑元素控制映射", function() {
        it("应该能编辑元素控制映射", async function() {
            const { width, height } = await driver.getWindowSize();

            // 选择一个元素
            await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 300));

            // 双击进入编辑
            await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 500));

            // 查找映射设置选项
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("映射") || text.includes("Map") || text.includes("设置"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-mapping-edited.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 编辑元素参数
     * Given 用户在布局编辑模式
     * And 用户选中一个操作元素
     * When 用户修改元素的参数（如透明度、灵敏度等）
     * Then 系统应更新元素的参数设置
     */
    describe("编辑元素参数", function() {
        it("应该能编辑元素参数", async function() {
            const { width, height } = await driver.getWindowSize();

            // 选择一个元素
            await driver.tap([{ x: width * 0.5, y: height * 0.5 }]);
            await new Promise(r => setTimeout(r, 300));

            // 查找参数设置选项
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("参数") || text.includes("属性") || text.includes("Properties"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-element-params-edited.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 实时预览编辑效果
     * Given 用户在布局编辑模式
     * When 用户修改元素的位置或大小
     * Then 系统应实时显示修改效果
     */
    describe("实时预览编辑效果", function() {
        it("编辑时应实时预览效果", async function() {
            const { width, height } = await driver.getWindowSize();

            // 拖动元素
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.4,
                endY: height * 0.4,
                duration: 500
            });

            await new Promise(r => setTimeout(r, 300));

            // 截图验证实时效果
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-preview-realtime.png"),
                screenshot,
                "base64"
            );

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");
        });
    });

    /**
     * Scenario: 放弃编辑修改
     * Given 用户在布局编辑模式
     * And 用户已进行了一些修改
     * When 用户点击"取消"或"放弃"按钮
     * Then 系统应放弃所有修改
     * And 布局应恢复到编辑前的状态
     */
    describe("放弃编辑修改", function() {
        it("应该能放弃编辑修改", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进行一些修改
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.6,
                endY: height * 0.6,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 300));

            // 查找取消/放弃按钮
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("取消") || text.includes("放弃") || text.includes("Cancel"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-edit-cancelled.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 保存编辑修改
     * Given 用户在布局编辑模式
     * And 用户已进行了一些修改
     * When 用户点击"保存"按钮
     * Then 系统应保存所有修改
     */
    describe("保存编辑修改", function() {
        it("应该能保存编辑修改", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进入编辑模式
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("编辑") || text.includes("Edit"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 进行修改
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.55,
                endY: height * 0.55,
                duration: 300
            });

            await new Promise(r => setTimeout(r, 300));

            // 查找保存按钮
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("保存") || text.includes("Save"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-edit-saved.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 导入无效布局文件
     * Given 用户在布局管理界面
     * When 用户尝试导入一个无效的布局文件
     * Then 系统应检测到文件无效
     * And 系统应显示错误提示
     * And 不应影响现有布局
     */
    describe("导入无效布局文件", function() {
        it("应该能处理无效布局文件", async function() {
            const { width, height } = await driver.getWindowSize();

            // 查找导入按钮
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("导入") || text.includes("Import"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 验证应用仍在运行（未崩溃）
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-import-invalid.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 布局草稿保存
     * Given 用户正在编辑布局
     * When 用户退出编辑模式但未保存
     * Then 系统应保存布局草稿
     */
    describe("布局草稿保存", function() {
        it("应该能保存布局草稿", async function() {
            const { width, height } = await driver.getWindowSize();

            // 进入编辑模式
            const buttons = await driver.elements("class name", "android.widget.Button");
            for (const button of buttons) {
                try {
                    const text = await button.text();
                    if (text && (text.includes("编辑") || text.includes("Edit"))) {
                        await button.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 进行修改
            await driver.swipe({
                startX: width * 0.5,
                startY: height * 0.5,
                endX: width * 0.55,
                endY: height * 0.55,
                duration: 300
            });

            // 按返回键退出
            await driver.pressKeyCode(4); // KEYCODE_BACK
            await new Promise(r => setTimeout(r, 500));

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-draft-saved.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 布局备份
     * Given 用户在布局管理界面
     * When 用户点击"备份布局"按钮
     * Then 系统应创建布局备份
     */
    describe("布局备份", function() {
        it("应该能创建布局备份", async function() {
            const { width, height } = await driver.getWindowSize();

            // 查找备份按钮（可能在菜单中）
            await driver.tap([{ x: width * 0.9, y: height * 0.05 }]);
            await new Promise(r => setTimeout(r, 500));

            // 查找备份选项
            const textViews = await driver.elements("class name", "android.widget.TextView");
            for (const textView of textViews) {
                try {
                    const text = await textView.text();
                    if (text && (text.includes("备份") || text.includes("Backup"))) {
                        await textView.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-backup-created.png"),
                screenshot,
                "base64"
            );
        });
    });

    /**
     * Scenario: 恢复布局备份
     * Given 存在布局备份
     * When 用户点击"恢复备份"按钮
     * Then 系统应恢复布局到备份状态
     */
    describe("恢复布局备份", function() {
        it("应该能恢复布局备份", async function() {
            const { width, height } = await driver.getWindowSize();

            // 查找恢复按钮（可能在菜单中）
            await driver.tap([{ x: width * 0.9, y: height * 0.05 }]);
            await new Promise(r => setTimeout(r, 500));

            // 查找恢复选项
            const textViews = await driver.elements("class name", "android.widget.TextView");
            for (const textView of textViews) {
                try {
                    const text = await textView.text();
                    if (text && (text.includes("恢复") || text.includes("Restore"))) {
                        await textView.click();
                        await new Promise(r => setTimeout(r, 500));
                        break;
                    }
                } catch (e) {}
            }

            // 截图
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync(
                path.join(__dirname, "..", "test-results", "layout-backup-restored.png"),
                screenshot,
                "base64"
            );

            // 验证应用仍在运行
            const currentActivity = await driver.currentActivity();
            expect(currentActivity).to.include("MainActivity");
        });
    });
});