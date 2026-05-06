const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { CONFIG } = require("./config");
const { log } = require("./utils");

async function buildServer() {
    log("🔨 Building server...");
    const buildStart = Date.now();

    if (!fs.existsSync(path.join(CONFIG.serverCwd, "node_modules"))) {
        log("📦 Installing server dependencies...");
        execSync("npm install", { cwd: CONFIG.serverCwd, stdio: "inherit", timeout: 120000 });
        log("✅ Server dependencies installed");
    }

    execSync("npm run build", {
        cwd: CONFIG.serverCwd,
        encoding: "utf8",
        stdio: "inherit",
        timeout: 120000
    });

    if (!fs.existsSync(CONFIG.serverPath)) {
        throw new Error(`Server build failed: ${CONFIG.serverPath} not found`);
    }

    log(`✅ Server built (${Date.now() - buildStart}ms)`);
}

async function runParallelBuild(buildServerFn, buildAndroidFn) {
    log("\n🔨 Phase 2: Parallel Build (Server + Android)");
    log("=".repeat(60));

    const [serverResult, androidResult] = await Promise.allSettled([
        buildServerFn(),
        buildAndroidFn()
    ]);

    if (serverResult.status === "rejected") {
        throw new Error(`Server build failed: ${serverResult.reason?.message || serverResult.reason}`);
    }
    if (androidResult.status === "rejected") {
        throw new Error(`Android build failed: ${androidResult.reason?.message || androidResult.reason}`);
    }
}

module.exports = {
    buildServer,
    runParallelBuild
};
