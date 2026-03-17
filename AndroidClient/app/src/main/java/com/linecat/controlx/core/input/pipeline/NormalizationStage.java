package com.linecat.controlx.core.input.pipeline;

import android.util.Log;

import com.linecat.controlx.platform.api.IInputProvider;

import java.util.ArrayList;
import java.util.List;

/**
 * 归一化处理阶段
 * 
 * 职责：将原始输入数据归一化到标准范围 (0.0-1.0)
 */
public class NormalizationStage implements InputStage {
    
    private static final String TAG = "NormalizationStage";
    
    @Override
    public InputPrimitives process(IInputProvider.RawInputData rawInput, InputPrimitives current) {
        // 归一化触摸坐标
        List<InputPrimitives.PointerEvent> normalizedPointers = new ArrayList<>();
        
        for (IInputProvider.PointerData pointer : rawInput.pointers) {
            // TODO: 需要 display metrics 来计算归一化坐标
            // 暂时使用原始坐标
            InputPrimitives.PointerEvent event = new InputPrimitives.PointerEvent(
                rawInput.timestampNs,
                InputPrimitives.PointerEventType.MOVE,
                pointer.x, // TODO: 归一化
                pointer.y, // TODO: 归一化
                pointer.id
            );
            normalizedPointers.add(event);
        }
        
        // 归一化陀螺仪数据
        float normalizedPitch = normalizeGyro(rawInput.gyroPitch);
        float normalizedRoll = normalizeGyro(rawInput.gyroRoll);
        float normalizedYaw = normalizeGyro(rawInput.gyroYaw);
        
        // 创建归一化的陀螺仪事件
        InputPrimitives.GyroscopeEvent gyroEvent = new InputPrimitives.GyroscopeEvent(
            rawInput.timestampNs,
            normalizedPitch,
            normalizedRoll,
            normalizedYaw
        );
        
        // 更新 current 对象
        current.setPointerEvents(normalizedPointers);
        current.setGyroscopeEvent(gyroEvent);
        
        return current;
    }
    
    /**
     * 归一化陀螺仪数据
     * TODO: 需要根据实际传感器范围调整
     */
    private float normalizeGyro(float value) {
        // 假设陀螺仪范围为 -π 到 +π
        final float MAX_GYRO = (float) Math.PI;
        return value / MAX_GYRO;
    }
    
    @Override
    public String getStageName() {
        return "NormalizationStage";
    }
}
