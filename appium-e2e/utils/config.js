const path = require("path");

const config = {
    backend: {
        portRange: {
            start: 10000,
            end: 60000
        },
        startupTimeout: 3000,
        serverPath: path.join(__dirname, "..", "Server", "dist", "app.js"),
        serverCwd: path.join(__dirname, "..", "Server"),
        env: {
            TEST_MODE: "true",
            DISABLE_ACTUAL_INPUT: "true"
        }
    },

    android: {
        gradlePath: path.join(__dirname, "..", "AndroidClient", "gradlew.bat"),
        gradleCwd: path.join(__dirname, "..", "AndroidClient"),
        buildCommand: "assembleDebug --no-daemon",
        packageName: "com.linecat.wmmtcontroller",
        mainActivity: "com.linecat.wmmtcontroller/.MainActivity",
        apkPath: path.join(__dirname, "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
        processName: "wmmtcontroller"
    },

    device: {
        id: "localhost:16384",
        appStartupDelay: 3000,
        processCheckDelay: 1000,
        tapDelay: 2000,
        backDelay: 1000,
        dumpDelay: 500
    },

    ui: {
        elements: {
            startButton: ["btn_start_service", "启动服务"],
            stopButton: ["btn_stop_service", "停止服务"],
            addressField: ["et_address", "地址"],
            allowButton: ["允许", "Allow", "Permit"]
        },
        coordinates: {
            startButton: { x: 540, y: 960 },
            overlayPermissionButton: { x: 540, y: 860 }
        }
    },

    timeouts: {
        appInit: 3000,
        tap: 2000,
        back: 1000,
        dump: 500
    }
};

module.exports = config;
