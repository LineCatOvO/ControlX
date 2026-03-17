package com.linecat.controlx.platform.api;

/**
 * 传感器提供者接口
 * 
 * 职责：提供传感器数据（陀螺仪、加速度计等）
 * 实现：AndroidSensorProvider (Android 平台)
 */
public interface ISensorProvider {
    
    /**
     * 注册传感器监听器
     * @param listener 传感器监听器
     */
    void registerListener(SensorListener listener);
    
    /**
     * 注销传感器监听器
     * @param listener 传感器监听器
     */
    void unregisterListener(SensorListener listener);
    
    /**
     * 检查传感器是否可用
     * @return 是否可用
     */
    boolean isAvailable();
    
    /**
     * 传感器监听器接口
     */
    interface SensorListener {
        /**
         * 陀螺仪数据回调
         * @param pitch 俯仰角速度 (弧度/秒)
         * @param roll 翻滚角速度 (弧度/秒)
         * @param yaw 偏航角速度 (弧度/秒)
         * @param timestampNs 时间戳 (纳秒)
         */
        void onGyroscopeData(float pitch, float roll, float yaw, long timestampNs);
        
        /**
         * 加速度计数据回调
         * @param x X 轴加速度 (m/s²)
         * @param y Y 轴加速度 (m/s²)
         * @param z Z 轴加速度 (m/s²)
         * @param timestampNs 时间戳 (纳秒)
         */
        void onAccelerometerData(float x, float y, float z, long timestampNs);
    }
}
