import fs from "fs";
import path from "path";

interface TestStep {
    stepId: number;
    name: string;
    status: "passed" | "failed" | "skipped";
    duration: number;
    error?: string;
}

interface VerificationPoint {
    pointId: number;
    name: string;
    status: "passed" | "failed";
    expected?: string;
    actual?: string;
}

interface TestCaseResult {
    testCaseId: string;
    name: string;
    status: "passed" | "failed" | "skipped";
    duration: number;
    steps: TestStep[];
    verificationPoints: VerificationPoint[];
    error?: string;
    timestamp: string;
}

interface TestEnvironment {
    os: string;
    nodeVersion: string;
    adbVersion?: string;
    deviceId?: string;
    backendPort?: number;
}

interface TestSummary {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    passRate: string;
    duration: string;
    startTime: string;
    endTime: string;
}

interface TestReport {
    testRunId: string;
    timestamp: string;
    environment: TestEnvironment;
    summary: TestSummary;
    testResults: TestCaseResult[];
    errors: string[];
    warnings: string[];
}

class TestReportGenerator {
    private testRunId: string;
    private startTime: Date;
    private testResults: TestCaseResult[] = [];
    private errors: string[] = [];
    private warnings: string[] = [];
    private environment: TestEnvironment;

    constructor() {
        this.testRunId = `test-${Date.now()}`;
        this.startTime = new Date();
        this.environment = {
            os: process.platform,
            nodeVersion: process.version
        };
    }

    setEnvironment(env: Partial<TestEnvironment>): void {
        this.environment = { ...this.environment, ...env };
    }

    addError(error: string): void {
        this.errors.push(error);
    }

    addWarning(warning: string): void {
        this.warnings.push(warning);
    }

    addTestResult(result: TestCaseResult): void {
        this.testResults.push(result);
    }

    private generateSummary(endTime: Date): TestSummary {
        const passedTests = this.testResults.filter(r => r.status === "passed").length;
        const failedTests = this.testResults.filter(r => r.status === "failed").length;
        const skippedTests = this.testResults.filter(r => r.status === "skipped").length;
        const totalTests = this.testResults.length;
        const duration = endTime.getTime() - this.startTime.getTime();
        const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0.0";

        return {
            totalTests,
            passedTests,
            failedTests,
            skippedTests,
            passRate: `${passRate}%`,
            duration: this.formatDuration(duration),
            startTime: this.startTime.toISOString(),
            endTime: endTime.toISOString()
        };
    }

    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${seconds}s`;
    }

    generateReport(): TestReport {
        const endTime = new Date();
        const summary = this.generateSummary(endTime);

        return {
            testRunId: this.testRunId,
            timestamp: this.startTime.toISOString(),
            environment: this.environment,
            summary,
            testResults: this.testResults,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    toJSON(): string {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    toHTML(): string {
        const report = this.generateReport();
        const statusColor = report.summary.failedTests === 0 ? "#4CAF50" : "#f44336";

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${report.testRunId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .header h1 { font-size: 2em; margin-bottom: 10px; }
        .header .test-run-id { opacity: 0.8; font-size: 0.9em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary-card h3 { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .summary-card.passed .value { color: #4CAF50; }
        .summary-card.failed .value { color: #f44336; }
        .summary-card.total .value { color: #2196F3; }
        .section { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h2 { margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #eee; }
        .test-case { border: 1px solid #eee; border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
        .test-case-header { padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
        .test-case-header:hover { background: #f9f9f9; }
        .test-case-header .name { font-weight: 500; }
        .test-case-header .status { padding: 5px 15px; border-radius: 20px; font-size: 0.8em; font-weight: 500; }
        .status-passed { background: #E8F5E9; color: #2E7D32; }
        .status-failed { background: #FFEBEE; color: #C62828; }
        .status-skipped { background: #FFF3E0; color: #EF6C00; }
        .test-case-body { padding: 15px; border-top: 1px solid #eee; background: #fafafa; }
        .steps, .verification-points { margin-top: 10px; }
        .step, .vp { padding: 8px 12px; margin: 5px 0; border-radius: 5px; font-size: 0.9em; }
        .step-passed, .vp-passed { background: #E8F5E9; }
        .step-failed, .vp-failed { background: #FFEBEE; }
        .environment { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .env-item { padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .env-item label { font-size: 0.8em; color: #666; display: block; }
        .env-item value { font-weight: 500; }
        .error-list, .warning-list { list-style: none; }
        .error-list li, .warning-list li { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .error-list li { background: #FFEBEE; border-left: 3px solid #f44336; }
        .warning-list li { background: #FFF3E0; border-left: 3px solid #FF9800; }
        .pass-rate { font-size: 3em; color: ${statusColor}; }
        @media (max-width: 768px) { .container { padding: 10px; } .header { padding: 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Report</h1>
            <div class="test-run-id">Test Run: ${report.testRunId}</div>
            <div style="margin-top: 10px; opacity: 0.8;">Generated: ${report.timestamp}</div>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.summary.totalTests}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${report.summary.passedTests}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="value">${report.summary.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="pass-rate">${report.summary.passRate}</div>
            </div>
        </div>

        <div class="section">
            <h2>🖥️ Environment</h2>
            <div class="environment">
                <div class="env-item">
                    <label>Operating System</label>
                    <value>${report.environment.os}</value>
                </div>
                <div class="env-item">
                    <label>Node Version</label>
                    <value>${report.environment.nodeVersion}</value>
                </div>
                ${report.environment.deviceId ? `
                <div class="env-item">
                    <label>Device ID</label>
                    <value>${report.environment.deviceId}</value>
                </div>` : ''}
                ${report.environment.backendPort ? `
                <div class="env-item">
                    <label>Backend Port</label>
                    <value>${report.environment.backendPort}</value>
                </div>` : ''}
            </div>
        </div>

        <div class="section">
            <h2>📋 Test Results</h2>
            ${report.testResults.map(testCase => `
                <div class="test-case">
                    <div class="test-case-header">
                        <span class="name">${testCase.name}</span>
                        <span class="status status-${testCase.status}">${testCase.status.toUpperCase()}</span>
                    </div>
                    <div class="test-case-body">
                        <div><strong>Duration:</strong> ${testCase.duration}ms</div>
                        ${testCase.error ? `<div style="color: #f44336; margin-top: 10px;"><strong>Error:</strong> ${testCase.error}</div>` : ''}
                        ${testCase.steps.length > 0 ? `
                            <div class="steps">
                                <strong>Steps:</strong>
                                ${testCase.steps.map(step => `
                                    <div class="step step-${step.status}">
                                        ${step.status === 'passed' ? '✅' : '❌'} ${step.name} (${step.duration}ms)
                                        ${step.error ? `<br><small>${step.error}</small>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${testCase.verificationPoints.length > 0 ? `
                            <div class="verification-points">
                                <strong>Verification Points:</strong>
                                ${testCase.verificationPoints.map(vp => `
                                    <div class="vp vp-${vp.status}">
                                        ${vp.status === 'passed' ? '✅' : '❌'} ${vp.name}
                                        ${vp.expected ? `<br><small>Expected: ${vp.expected}</small>` : ''}
                                        ${vp.actual ? `<br><small>Actual: ${vp.actual}</small>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${report.errors.length > 0 ? `
            <div class="section">
                <h2>❌ Errors</h2>
                <ul class="error-list">
                    ${report.errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${report.warnings.length > 0 ? `
            <div class="section">
                <h2>⚠️ Warnings</h2>
                <ul class="warning-list">
                    ${report.warnings.map(warning => `<li>${warning}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div class="section">
            <h2>📊 Summary</h2>
            <p><strong>Duration:</strong> ${report.summary.duration}</p>
            <p><strong>Start Time:</strong> ${report.summary.startTime}</p>
            <p><strong>End Time:</strong> ${report.summary.endTime}</p>
        </div>
    </div>
</body>
</html>`;
    }

    toJUnitXML(): string {
        const report = this.generateReport();
        const testCases = report.testResults.map(tc => {
            const failureXml = tc.status === "failed" && tc.error
                ? `<failure message="${this.escapeXml(tc.error)}"/>`
                : "";
            return `    <testcase name="${this.escapeXml(tc.name)}" classname="${this.escapeXml(tc.testCaseId)}" time="${tc.duration / 1000}">
      ${failureXml}
    </testcase>`;
        }).join("\n");

        return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="WMMTController E2E Tests" tests="${report.summary.totalTests}" failures="${report.summary.failedTests}" skipped="${report.summary.skippedTests}" time="${this.parseDuration(report.summary.duration)}">
${testCases}
</testsuite>`;
    }

    private escapeXml(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    private parseDuration(duration: string): number {
        const match = duration.match(/(?:(\d+)m\s*)?(\d+)s/);
        if (match) {
            const minutes = match[1] ? parseInt(match[1]) : 0;
            const seconds = parseInt(match[2]);
            return minutes * 60 + seconds;
        }
        return 0;
    }

    saveToFile(outputDir: string, formats: ("json" | "html" | "junit")[] = ["json", "html", "junit"]): void {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const format of formats) {
            const filename = `test-report-${this.testRunId}`;
            let content: string;
            let extension: string;

            switch (format) {
                case "json":
                    content = this.toJSON();
                    extension = "json";
                    break;
                case "html":
                    content = this.toHTML();
                    extension = "html";
                    break;
                case "junit":
                    content = this.toJUnitXML();
                    extension = "xml";
                    break;
            }

            const filepath = path.join(outputDir, `${filename}.${extension}`);
            fs.writeFileSync(filepath, content, "utf-8");
            console.log(`📄 Report saved: ${filepath}`);
        }
    }
}

export {
    TestReportGenerator,
    TestReport,
    TestCaseResult,
    TestStep,
    VerificationPoint,
    TestEnvironment,
    TestSummary
};
