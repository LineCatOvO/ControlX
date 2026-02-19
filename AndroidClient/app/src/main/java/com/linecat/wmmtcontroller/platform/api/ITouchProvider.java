package com.linecat.wmmtcontroller.platform.api;

/**
 * 触摸提供者接口
 * 
 * 职责：提供触摸事件数据
 * 实现：AndroidTouchProvider (Android 平台)
 */
public interface ITouchProvider {
    
    /**
     * 设置触摸监听器
     * @param listener 触摸监听器
     */
    void setTouchListener(TouchListener listener);
    
    /**
     * 清除触摸监听器
     */
    void clearTouchListener();
    
    /**
     * 触摸监听器接口
     */
    interface TouchListener {
        /**
         * 指针按下事件
         * @param pointerId 指针 ID
         * @param x X 坐标 (像素)
         * @param y Y 坐标 (像素)
         * @param timestampNs 时间戳 (纳秒)
         */
        void onPointerDown(int pointerId, float x, float y, long timestampNs);
        
        /**
         * 指针移动事件
         * @param pointerId 指针 ID
         * @param x X 坐标 (像素)
         * @param y Y 坐标 (像素)
         * @param timestampNs 时间戳 (纳秒)
         */
        void onPointerMove(int pointerId, float x, float y, long timestampNs);
        
        /**
         * 指针抬起事件
         * @param pointerId 指针 ID
         * @param timestampNs 时间戳 (纳秒)
         */
        void onPointerUp(int pointerId, long timestampNs);
        
        /**
         * 指针取消事件
         * @param pointerId 指针 ID
         * @param timestampNs 时间戳 (纳秒)
         */
        void onPointerCancel(int pointerId, long timestampNs);
    }
}
