package com.linecat.controlx.core.input.pipeline;

import java.util.ArrayList;
import java.util.List;

/**
 * 输入原语类
 * 与 Android 无关的输入模型
 * 用于在 Input Pipeline 各阶段之间传递数据
 */
public class InputPrimitives {
    protected long timestamp;  // 时间戳
    
    // 指针事件列表
    private List<PointerEvent> pointerEvents;
    
    // 陀螺仪事件
    private GyroscopeEvent gyroscopeEvent;

    public InputPrimitives(long timestamp) {
        this.timestamp = timestamp;
        this.pointerEvents = new ArrayList<>();
    }

    // Getter/Setter
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
    
    public List<PointerEvent> getPointerEvents() { return pointerEvents; }
    public void setPointerEvents(List<PointerEvent> pointerEvents) { 
        this.pointerEvents = pointerEvents != null ? pointerEvents : new ArrayList<>();
    }
    
    public GyroscopeEvent getGyroscopeEvent() { return gyroscopeEvent; }
    public void setGyroscopeEvent(GyroscopeEvent gyroscopeEvent) { 
        this.gyroscopeEvent = gyroscopeEvent; 
    }
    
    /**
     * 添加指针事件
     */
    public void addPointerEvent(PointerEvent event) {
        if (event != null) {
            pointerEvents.add(event);
        }
    }

    /**
     * 指针事件类型
     */
    public enum PointerEventType {
        DOWN,   // 按下
        MOVE,   // 移动
        UP      // 抬起
    }
    
    /**
     * 指针事件
     */
    public static class PointerEvent {
        private PointerEventType type;   // 事件类型
        private float x;                 // X 坐标
        private float y;                 // Y 坐标
        private int pointerId;           // 指针 ID
        private long timestamp;

        public PointerEvent(long timestamp, PointerEventType type, float x, float y, int pointerId) {
            this.timestamp = timestamp;
            this.type = type;
            this.x = x;
            this.y = y;
            this.pointerId = pointerId;
        }

        // Getters
        public long getTimestamp() { return timestamp; }
        public PointerEventType getType() { return type; }
        public float getX() { return x; }
        public float getY() { return y; }
        public int getPointerId() { return pointerId; }

        @Override
        public String toString() {
            return "PointerEvent{" +
                    "timestamp=" + timestamp +
                    ", type=" + type +
                    ", x=" + x +
                    ", y=" + y +
                    ", pointerId=" + pointerId +
                    '}';
        }
    }
    
    /**
     * 陀螺仪事件
     */
    public static class GyroscopeEvent {
        private float pitch;
        private float roll;
        private float yaw;
        private long timestamp;
        
        public GyroscopeEvent(long timestamp, float pitch, float roll, float yaw) {
            this.timestamp = timestamp;
            this.pitch = pitch;
            this.roll = roll;
            this.yaw = yaw;
        }
        
        public long getTimestamp() { return timestamp; }
        public float getPitch() { return pitch; }
        public float getRoll() { return roll; }
        public float getYaw() { return yaw; }
        
        @Override
        public String toString() {
            return "GyroscopeEvent{" +
                    "timestamp=" + timestamp +
                    ", pitch=" + pitch +
                    ", roll=" + roll +
                    ", yaw=" + yaw +
                    '}';
        }
    }
}
