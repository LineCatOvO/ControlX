import path from "path";

interface BackendConfig {
    portRange: {
        start: number;
        end: number;
    };
    startupTimeout: number;
    serverPath: string;
    serverCwd: string;
    env: {
        TEST_MODE: string;
        DISABLE_ACTUAL_INPUT: string;
    };
}

interface DockerConfig {
    enabled: boolean;
    appiumHost: string;
    appiumPort: number;
    backendHost: string;
    backendPortRange: {
        start: number;
        end: number;
    };
    networkName: string;
    containers: {
        appium: string;
        backend: string;
    };
}

interface AppiumConfig {
    host: string;
    port: number;
    basePath: string;
    capabilities: {
        platformName: string;
        automationName: string;
        deviceName: string;
        noReset: boolean;
        fullReset: boolean;
    };
}

interface AndroidConfig {
    gradlePath: string;
    gradleCwd: string;
    buildCommand: string;
    packageName: string;
    mainActivity: string;
    apkPath: string;
    processName: string;
}

interface DeviceConfig {
    id: string;
    appStartupDelay: number;
    processCheckDelay: number;
    tapDelay: number;
    backDelay: number;
    dumpDelay: number;
}

interface UIConfig {
    elements: {
        startButton: string[];
        stopButton: string[];
        addressField: string[];
        allowButton: string[];
    };
    coordinates: {
        startButton: {
            x: number;
            y: number;
        };
        overlayPermissionButton: {
            x: number;
            y: number;
        };
    };
}

interface TimeoutsConfig {
    appInit: number;
    tap: number;
    back: number;
    dump: number;
}

interface Config {
    backend: BackendConfig;
    docker: DockerConfig;
    appium: AppiumConfig;
    android: AndroidConfig;
    device: DeviceConfig;
    ui: UIConfig;
    timeouts: TimeoutsConfig;
}

const isDockerEnvironment = process.env.DOCKER_ENV === 'true' || 
                            process.env.NODE_ENV === 'docker';

const config: Config = {
    backend: {
        portRange: {
            start: 10000,
            end: 60000
        },
        startupTimeout: 3000,
        serverPath: isDockerEnvironment 
            ? "/app/server/dist/app.js"
            : path.join(__dirname, "..", "..", "..", "Server", "dist", "app.js"),
        serverCwd: isDockerEnvironment 
            ? "/app/server"
            : path.join(__dirname, "..", "..", "..", "Server"),
        env: {
            TEST_MODE: "true",
            DISABLE_ACTUAL_INPUT: "true"
        }
    },

    docker: {
        enabled: isDockerEnvironment,
        appiumHost: process.env.APPIUM_HOST || "localhost",
        appiumPort: parseInt(process.env.APPIUM_PORT || "4723", 10),
        backendHost: process.env.BACKEND_HOST || "localhost",
        backendPortRange: {
            start: 10000,
            end: 60000
        },
        networkName: "controlx-network",
        containers: {
            appium: "controlx-appium",
            backend: "controlx-backend"
        }
    },

    appium: {
        host: process.env.APPIUM_HOST || "localhost",
        port: parseInt(process.env.APPIUM_PORT || "4723", 10),
        basePath: "/wd/hub",
        capabilities: {
            platformName: "android",
            automationName: "uiautomator2",
            deviceName: "Android Device",
            noReset: true,
            fullReset: false
        }
    },

    android: {
        gradlePath: path.join(__dirname, "..", "..", "..", "AndroidClient", "gradlew.bat"),
        gradleCwd: path.join(__dirname, "..", "..", "..", "AndroidClient"),
        buildCommand: "assembleDebug --no-daemon",
        packageName: "com.linecat.controlx",
        mainActivity: "com.linecat.controlx/.MainActivity",
        apkPath: path.join(__dirname, "..", "..", "..", "AndroidClient", "app", "build", "outputs", "apk", "debug", "app-debug.apk"),
        processName: "controlx"
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

export default config;