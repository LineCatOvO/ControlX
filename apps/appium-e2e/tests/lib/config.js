const path = require("path");

const CONFIG = {
    packageName: "com.linecat.controlx",
    mainActivity: "com.linecat.controlx/.MainActivity",
    projectRoot: path.join(__dirname, "..", "..", ".."),
    get serverPath() { return path.join(this.projectRoot, "Server", "dist", "app.js"); },
    get serverCwd() { return path.join(this.projectRoot, "Server"); },
    get androidProjectPath() { return path.join(this.projectRoot, "AndroidClient"); },
    get apkOutputPath() { return path.join(this.androidProjectPath, "app", "build", "outputs", "apk", "debug", "app-debug.apk"); }
};

module.exports = { CONFIG };
