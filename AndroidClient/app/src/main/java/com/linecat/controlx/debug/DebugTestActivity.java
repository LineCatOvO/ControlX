package com.linecat.controlx.debug;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.linecat.controlx.R;

/**
 * Debug测试Activity
 * 用于测试debug模式和权限绕过功能
 */
public class DebugTestActivity extends AppCompatActivity {
    private static final String TAG = "DebugTestActivity";
    
    private DebugModeManager debugManager;
    private TextView statusTextView;
    private Button toggleDebugModeButton;
    private Button toggleBypassButton;
    private Button toggleSimulationButton;
    private Button simulateTouchButton;
    private Button simulateGyroButton;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_debug_test);
        
        debugManager = DebugModeManager.getInstance(this);
        
        // 初始化UI组件
        statusTextView = findViewById(R.id.tv_debug_status);
        toggleDebugModeButton = findViewById(R.id.btn_toggle_debug_mode);
        toggleBypassButton = findViewById(R.id.btn_toggle_bypass);
        toggleSimulationButton = findViewById(R.id.btn_toggle_simulation);
        simulateTouchButton = findViewById(R.id.btn_simulate_touch);
        simulateGyroButton = findViewById(R.id.btn_simulate_gyro);
        
        // 设置按钮点击事件
        setupButtonClickListeners();
        
        // 更新初始状态
        updateStatusDisplay();
    }
    
    private void setupButtonClickListeners() {
        // 切换debug模式
        toggleDebugModeButton.setOnClickListener(v -> {
            if (debugManager.isDebugModeEnabled()) {
                debugManager.disableDebugMode();
            } else {
                debugManager.enableDebugMode();
            }
            updateStatusDisplay();
            showToast("Debug模式已" + (debugManager.isDebugModeEnabled() ? "启用" : "禁用"));
        });
        
        // 切换权限绕过
        toggleBypassButton.setOnClickListener(v -> {
            if (!debugManager.isDebugModeEnabled()) {
                showToast("请先启用Debug模式");
                return;
            }
            
            if (debugManager.shouldBypassOverlayPermission()) {
                debugManager.disableBypassOverlayPermission();
            } else {
                debugManager.enableBypassOverlayPermission();
            }
            updateStatusDisplay();
            showToast("权限绕过已" + (debugManager.shouldBypassOverlayPermission() ? "启用" : "禁用"));
        });
        
        // 切换输入事件模拟
        toggleSimulationButton.setOnClickListener(v -> {
            if (!debugManager.isDebugModeEnabled()) {
                showToast("请先启用Debug模式");
                return;
            }
            
            if (debugManager.isSimulateInputEventsEnabled()) {
                debugManager.disableSimulateInputEvents();
            } else {
                debugManager.enableSimulateInputEvents();
            }
            updateStatusDisplay();
            showToast("输入事件模拟已" + (debugManager.isSimulateInputEventsEnabled() ? "启用" : "禁用"));
        });
        
        // 模拟触摸事件
        simulateTouchButton.setOnClickListener(v -> {
            if (!debugManager.isSimulateInputEventsEnabled()) {
                showToast("请先启用输入事件模拟");
                return;
            }
            
            // 模拟点击屏幕中心
            float centerX = getResources().getDisplayMetrics().widthPixels / 2.0f;
            float centerY = getResources().getDisplayMetrics().heightPixels / 2.0f;
            debugManager.simulateTouchEvent(centerX, centerY, 0); // 0 = ACTION_DOWN
            showToast("已模拟触摸事件: (" + centerX + ", " + centerY + ")");
        });
        
        // 模拟陀螺仪事件
        simulateGyroButton.setOnClickListener(v -> {
            if (!debugManager.isSimulateInputEventsEnabled()) {
                showToast("请先启用输入事件模拟");
                return;
            }
            
            // 模拟陀螺仪数据
            debugManager.simulateGyroEvent(1.0f, 0.5f, -0.3f);
            showToast("已模拟陀螺仪事件: yaw=1.0, pitch=0.5, roll=-0.3");
        });
    }
    
    private void updateStatusDisplay() {
        runOnUiThread(() -> {
            String status = debugManager.getDebugStatusSummary();
            statusTextView.setText(status);
            
            // 更新按钮状态
            toggleDebugModeButton.setText(
                debugManager.isDebugModeEnabled() ? "禁用Debug模式" : "启用Debug模式"
            );
            
            toggleBypassButton.setText(
                debugManager.shouldBypassOverlayPermission() ? "禁用权限绕过" : "启用权限绕过"
            );
            toggleBypassButton.setEnabled(debugManager.isDebugModeEnabled());
            
            toggleSimulationButton.setText(
                debugManager.isSimulateInputEventsEnabled() ? "禁用事件模拟" : "启用事件模拟"
            );
            toggleSimulationButton.setEnabled(debugManager.isDebugModeEnabled());
            
            simulateTouchButton.setEnabled(debugManager.isSimulateInputEventsEnabled());
            simulateGyroButton.setEnabled(debugManager.isSimulateInputEventsEnabled());
        });
    }
    
    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
        Log.d(TAG, message);
    }
}