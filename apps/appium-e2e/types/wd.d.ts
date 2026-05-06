declare module 'wd' {
    interface WebDriver {
        init(capabilities: any): Promise<WebDriver>;
        quit(): Promise<void>;
        waitForElementByAccessibilityId(locator: string, timeout: number): Promise<Element>;
        elementByAccessibilityId(locator: string): Promise<Element>;
        takeScreenshot(): Promise<string>;
        swipe(options: {
            startX: number;
            startY: number;
            endX: number;
            endY: number;
            duration: number;
        }): Promise<void>;
    }

    interface Element {
        click(): Promise<void>;
        sendKeys(text: string): Promise<void>;
        text(): Promise<string>;
    }

    function promiseChainRemote(host: string, port: number): WebDriver;
}

declare module 'wd/lib/main' {
    export * from 'wd';
}