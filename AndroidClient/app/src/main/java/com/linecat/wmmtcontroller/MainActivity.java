package com.linecat.wmmtcontroller;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.linecat.wmmtcontroller.service.InputRuntimeService;

/**
 * 主活动
 * 仅作为Service启动器，负责启动/停止输入运行时服务
 */
public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    
    // UI组件
    private TextView statusText;
    private Button startButton;
    private Button stopButton;
    private boolean isServiceRunning = false;
    
    // 移除了REQUEST_OVERLAY_PERMISSION常量，不再需要浮窗权限检查
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // 初始化UI组件
        statusText = findViewById(R.id.status_text);
        startButton = findViewById(R.id.btn_start_service);
        stopButton = findViewById(R.id.btn_stop_service);
        
        // 设置按钮点击事件
        startButton.setOnClickListener(v -> startInputService());
        stopButton.setOnClickListener(v -> stopInputService());
        
        // 不再自动检查浮窗权限，允许服务在无权限下启动
        Log.d(TAG, "Skipping automatic overlay permission check - service can start without overlay permission");
        
        // 更新初始状态
        updateStatus();
    }
    
    // 移除了浮窗权限检查和请求的相关方法
    // 应用现在可以在无浮窗权限的情况下正常启动核心服务
    
    /**
     * 启动输入运行时服务
     */
    private void startInputService() {

        Intent intent = new Intent(this, InputRuntimeService.class);
        startService(intent);
        isServiceRunning = true;
        updateStatus();
    }
    
    /**
     * 停止输入运行时服务
     */
    private void stopInputService() {

        Intent intent = new Intent(this, InputRuntimeService.class);
        stopService(intent);
        isServiceRunning = false;
        updateStatus();
    }
    
    /**
     * 更新服务状态UI
     */
    private void updateStatus() {
        runOnUiThread(() -> {
            if (isServiceRunning) {
                statusText.setText("服务状态: 已启动");
                startButton.setEnabled(false);
                stopButton.setEnabled(true);
            } else {
                statusText.setText("服务状态: 已停止");
                startButton.setEnabled(true);
                stopButton.setEnabled(false);
            }
        });
    }
}