/**
 * ViGEmBus Detection Utility
 *
 * Used to detect if the current environment supports ViGEmBus driver
 *
 * @remarks
 * ViGEmBus is a Windows-specific virtual Xbox 360 controller driver
 * - Only available on Windows platform
 * - Requires administrator privileges to install
 * - Tests should be automatically skipped in non-Windows environments
 */

/**
 * Detect if current platform supports ViGEmBus
 * @returns true if Windows platform, otherwise false
 */
export function isWindowsPlatform(): boolean {
    return process.platform === 'win32';
}

/**
 * Detect if current environment might support ViGEmBus
 *
 * @remarks
 * This function performs the following checks:
 * 1. Is platform Windows
 * 2. Can require('vigemclient') module
 *
 * @returns true if environment supports ViGEmBus, otherwise false
 */
export function detectViGEmBusAvailability(): boolean {
    // First check platform
    if (!isWindowsPlatform()) {
        return false;
    }

    // Try to dynamically load vigemclient module
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const vigemclient = require('vigemclient');
        return !!vigemclient;
    } catch (error) {
        // Module load failed, vigemclient not installed or unavailable
        return false;
    }
}

/**
 * Get reason why ViGEmBus is unavailable
 * @returns String describing the unavailable reason
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
 * Skip tests on non-Windows platforms
 *
 * @param testName Test name
 * @param reason Skip reason (optional)
 * @returns Test function with skip marker
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
            // Empty function, test has been skipped
        }
    };
}

/**
 * Conditional test execution
 *
 * @param condition Execution condition
 * @param testName Test name
 * @param fn Test function
 *
 * @example
 * ```typescript
 * conditionalTest(
 *     detectViGEmBusAvailability(),
 *     'should connect to ViGEmBus',
 *     () => { /* Test logic *\/ }
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
            // Test skipped
        });
    }
}