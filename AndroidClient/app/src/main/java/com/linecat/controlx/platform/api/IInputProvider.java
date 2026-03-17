package com.linecat.controlx.platform.api;

import java.util.List;

/**
 * 输入提供者接口
 * 
 * 职责：提供原始输入数据收集
 * 实现：AndroidInputProvider (Android 平台)
 */
public interface IInputProvider {
    
    /**
     * 指针数据
     */
    class PointerData {
        public final int id;
        public final float x;
        public final float y;
        
        public PointerData(int id, float x, float y) {
            this.id = id;
            this.x = x;
            this.y = y;
        }
    }
    
    /**
     * 原始输入监听器
     */
    interface RawInputListener {
        /**
         * 原始输入数据回调
         * @param pointers 指针列表
         * @param gyroPitch 陀螺仪俯仰角
         * @param gyroRoll 陀螺仪翻滚角
         * @param gyroYaw 陀螺仪偏航角
         * @param timestampNs 时间戳
         */
        void onRawInput(List<PointerData> pointers, 
                       float gyroPitch, float gyroRoll, float gyroYaw,
                       long timestampNs);
    }
    
    /**
     * 原始输入数据类
     */
    class RawInputData {
        public final List<PointerData> pointers;
        public final float gyroPitch;
        public final float gyroRoll;
        public final float gyroYaw;
        public final long timestampNs;
        
        public RawInputData(List<PointerData> pointers, 
                           float gyroPitch, float gyroRoll, float gyroYaw,
                           long timestampNs) {
            this.pointers = pointers;
            this.gyroPitch = gyroPitch;
            this.gyroRoll = gyroRoll;
            this.gyroYaw = gyroYaw;
            this.timestampNs = timestampNs;
        }
    }
    
    /**
     * 设置原始输入监听器
     * @param listener 原始输入监听器
     */
    void setRawInputListener(RawInputListener listener);
    
    /**
     * 清除原始输入监听器
     */
    void clearRawInputListener();
    
    /**
     * 开始收集输入
     */
    void startCollection();
    
    /**
     * 停止收集输入
     */
    void stopCollection();
    
    /**
     * 检查是否在收集输入
     * @return 是否收集中
     */
    boolean isCollecting();
}
