package com.linecat.controlx.platform.api;

import android.view.WindowManager;

/**
 * 覆盖层提供者接口
 * 
 * 职责：管理悬浮窗覆盖层
 * 实现：AndroidOverlayProvider (Android 平台)
 */
public interface IOverlayProvider {
    
    /**
     * 覆盖层模式枚举
     */
    enum OverlayMode {
        /** 系统覆盖层 (TYPE_APPLICATION_OVERLAY) - 生产环境使用 */
        SYSTEM_OVERLAY,
        /** Activity 面板 (TYPE_APPLICATION_PANEL) - 测试环境使用 */
        ACTIVITY_PANEL
    }
    
    /**
     * 窗口指标数据
     */
    class DisplayMetrics {
        public final int widthPx;
        public final int heightPx;
        public final int rotation;
        
        public DisplayMetrics(int widthPx, int heightPx, int rotation) {
            this.widthPx = widthPx;
            this.heightPx = heightPx;
            this.rotation = rotation;
        }
    }
    
    /**
     * 窗口事件监听器
     */
    interface WindowListener {
        /**
         * 窗口附加成功
         * @param metrics 窗口指标
         */
        void onWindowAttached(DisplayMetrics metrics);
        
        /**
         * 窗口附加失败
         * @param reason 失败原因
         */
        void onWindowAttachFailed(String reason);
        
        /**
         * 窗口分离
         */
        void onWindowDetached();
    }
    
    /**
     * 启动覆盖层
     * @param listener 窗口监听器
     * @return 是否启动成功
     */
    boolean startOverlay(WindowListener listener);
    
    /**
     * 停止覆盖层
     */
    void stopOverlay();
    
    /**
     * 检查覆盖层是否正在运行
     * @return 是否运行中
     */
    boolean isOverlayRunning();
    
    /**
     * 获取当前窗口指标
     * @return 窗口指标
     */
    DisplayMetrics getDisplayMetrics();
    
    /**
     * 设置视图内容
     * @param view 要显示的视图
     */
    void setView(android.view.View view);
}
