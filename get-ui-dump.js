const { execSync } = require('child_process');

const deviceId = 'emulator-5554';

console.log('Getting UI dump...');

try {
    // 启动应用
    console.log('1. Starting app...');
    execSync(`adb -s ${deviceId} shell am start -n com.linecat.wmmtcontroller/.MainActivity`, { stdio: 'pipe' });
    console.log('App started');
    
    // 等待应用初始化
    console.log('2. Waiting for app initialization...');
    setTimeout(() => {
        try {
            // 执行 UI 转储
            console.log('3. Dumping UI...');
            execSync(`adb -s ${deviceId} shell uiautomator dump`, { stdio: 'pipe' });
            
            // 获取转储内容
            const dumpOutput = execSync(`adb -s ${deviceId} shell cat /sdcard/window_dump.xml`, {
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            console.log('\n=== UI Dump Output ===');
            console.log(dumpOutput);
            console.log('=== End of UI Dump ===');
            
            // 查找关键元素
            console.log('\n=== Key Elements Found ===');
            const elements = {
                titleText: dumpOutput.includes('title_text') || dumpOutput.includes('WMMT 远程控制器'),
                statusText: dumpOutput.includes('status_text') || dumpOutput.includes('服务状态'),
                startButton: dumpOutput.includes('btn_start_service') || dumpOutput.includes('启动服务'),
                stopButton: dumpOutput.includes('btn_stop_service') || dumpOutput.includes('停止服务'),
                hintText: dumpOutput.includes('浮窗将自动显示在屏幕上')
            };
            
            Object.entries(elements).forEach(([key, found]) => {
                console.log(`${key}: ${found ? '✅ Found' : '❌ Not found'}`);
            });
            
        } catch (error) {
            console.error('Error getting UI dump:', error.message);
        }
    }, 3000);
    
} catch (error) {
    console.error('Error starting app:', error.message);
}
