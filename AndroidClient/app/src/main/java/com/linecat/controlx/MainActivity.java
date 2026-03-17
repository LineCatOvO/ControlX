package com.linecat.controlx;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.linecat.controlx.service.InputRuntimeService;

/**
 * 主活动
 * 仅作为Service启动器，负责启动/停止输入运行时服务
 */
public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final int REQUEST_OVERLAY_PERMISSION = 1001;
    
    // UI组件
    private TextView statusText;
    private Button startButton;
    private Button stopButton;
    private Button overlayPermissionButton;
    private boolean isServiceRunning = false;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // 初始化UI组件
        statusText = findViewById(R.id.status_text);
        startButton = findViewById(R.id.btn_start_service);
        stopButton = findViewById(R.id.btn_stop_service);
        overlayPermissionButton = findViewById(R.id.btn_overlay_permission);
        
        // 设置按钮点击事件
        startButton.setOnClickListener(v -> startInputService());
        stopButton.setOnClickListener(v -> stopInputService());
        overlayPermissionButton.setOnClickListener(v -> requestOverlayPermission());
        
        // 不再自动检查浮窗权限，允许服务在无权限下启动
        Log.d(TAG, "Skipping automatic overlay permission check - service can start without overlay permission");
        
        // 更新初始状态
        updateStatus();
    }
    
    /**
     * 检查并请求浮窗权限
     */
    private void requestOverlayPermission() {
        Log.d(TAG, "requestOverlayPermission called");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    Log.d(TAG, "Starting overlay permission activity: " + intent);
                    startActivity(intent);
                    Log.d(TAG, "Overlay permission activity started successfully");
                    Toast.makeText(this, "正在获取浮窗权限...", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start overlay permission activity", e);
                    // 如果包名方式失败，尝试通用方式
                    try {
                        Intent fallbackIntent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                        fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(fallbackIntent);
                        Log.d(TAG, "Fallback overlay permission activity started");
                        Toast.makeText(this, "正在获取浮窗权限...", Toast.LENGTH_SHORT).show();
                    } catch (Exception e2) {
                        Log.e(TAG, "Failed to start fallback overlay permission activity", e2);
                        Toast.makeText(this, "无法打开权限设置页面", Toast.LENGTH_SHORT).show();
                    }
                }
            } else {
                Log.d(TAG, "Overlay permission already granted");
                Toast.makeText(this, "浮窗权限已授予", Toast.LENGTH_SHORT).show();
            }
        } else {
            Log.d(TAG, "Android version below M, overlay permission not required");
            Toast.makeText(this, "当前系统版本无需浮窗权限", Toast.LENGTH_SHORT).show();
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_OVERLAY_PERMISSION) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    Log.d(TAG, "Overlay permission granted");
                } else {
                    Log.d(TAG, "Overlay permission denied");
                }
            }
        }
    }
    
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