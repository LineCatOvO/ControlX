/**
 * ViGEmBus 检测工具
 * 
 * 用于检测当前环境是否支持 ViGEmBus 驱动
 * 
 * @remarks
 * ViGEmBus 是 Windows 专用的虚拟 Xbox 360 控制器驱动
 * - 仅在 Windows 平台上可用
 * - 需要管理员权限安装
 * - 在非 Windows 环境下测试应自动跳过
 */

/**
 * 检测当前平台是否支持 ViGEmBus
 * @returns true 如果是 Windows 平台，否则 false
 */
export function isWindowsPlatform(): boolean {
    return process.platform === 'win32';
}

/**
 * 检测当前环境是否可能支持 ViGEmBus
 * 
 * @remarks
 * 此函数进行以下检查：
 * 1. 平台是否为 Windows
 * 2. 是否可以 require('vigemclient') 模块
 * 
 * @returns true 如果环境支持 ViGEmBus，否则 false
 */
export function detectViGEmBusAvailability(): boolean {
    // 首先检查平台
    if (!isWindowsPlatform()) {
        return false;
    }

    // 尝试动态加载 vigemclient 模块
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const vigemclient = require('vigemclient');
        return !!vigemclient;
    } catch (error) {
        // 模块加载失败，说明 vigemclient 未安装或不可用
        return false;
    }
}

/**
 * 获取 ViGEmBus 不可用的原因
 * @returns 描述不可用原因的字符串
 */
export function getViGEmBusUnavailableReason(): string {
    if (process.platform !== 'win32') {
        return `Unsupported platform: ${process.platform}. ViGEmBus only works on Windows.`;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('vigemclient');
        return 'Unknown reason';
    } catch (error: any) {
        return `Module load error: ${error.message}. ViGEmBus driver or vigemclient package may not be installed.`;
    }
}

/**
 * 跳过非 Windows 平台的测试
 * 
 * @param testName 测试名称
 * @param reason 跳过原因（可选）
 * @returns 包含 skip 标记的测试函数
 * 
 * @example
 * ```typescript
 * const skipOnNonWindows = skipOnNonWindows('should connect to ViGEmBus');
 * test(skipOnNonWindows.testName, skipOnNonWindows.fn);
 * ```
 */
export function skipOnNonWindows(testName: string, reason?: string) {
    const fullReason = reason || getViGEmBusUnavailableReason();
    const skipTestName = `${testName} [SKIPPED: ${fullReason}]`;
    
    return {
        testName: skipTestName,
        fn: () => {
            // 空函数，测试已被跳过
        }
    };
}

/**
 * 条件执行测试
 * 
 * @param condition 执行条件
 * @param testName 测试名称
 * @param fn 测试函数
 * 
 * @example
 * ```typescript
 * conditionalTest(
 *     detectViGEmBusAvailability(),
 *     'should connect to ViGEmBus',
 *     () => { /* 测试逻辑 *\/ }
 * );
 * ```
 */
export function conditionalTest(
    condition: boolean,
    testName: string,
    fn: () => void
) {
    if (condition) {
        test(testName, fn);
    } else {
        const reason = getViGEmBusUnavailableReason();
        test.skip(`${testName} [SKIPPED: ${reason}]`, () => {
            // 测试被跳过
        });
    }
}
