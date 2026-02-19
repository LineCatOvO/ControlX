package com.linecat.wmmtcontroller.core.input.pipeline;

import android.util.Log;

import com.linecat.wmmtcontroller.platform.api.IInputProvider;

import java.util.List;

/**
 * 合并处理阶段
 * 
 * 职责：合并高频 MOVE 事件，输出目标频率 (60Hz)
 */
public class MergeStage implements InputStage {
    
    private static final String TAG = "MergeStage";
    private static final long TARGET_INTERVAL_NS = 16666666L; // 60Hz ≈ 16.67ms
    
    private long lastOutputTimeNs = 0;
    private InputPrimitives pendingPrimitives = null;
    
    @Override
    public InputPrimitives process(IInputProvider.RawInputData rawInput, InputPrimitives current) {
        long currentTimeNs = rawInput.timestampNs;
        
        // 检查是否达到输出间隔
        if (currentTimeNs - lastOutputTimeNs >= TARGET_INTERVAL_NS) {
            // 有待处理的合并数据
            if (pendingPrimitives != null) {
                // 输出合并后的数据
                lastOutputTimeNs = currentTimeNs;
                InputPrimitives result = pendingPrimitives;
                pendingPrimitives = null;
                return result;
            }
            
            // 没有待处理数据，直接输出当前数据
            lastOutputTimeNs = currentTimeNs;
            return current;
        } else {
            // 未达到输出间隔，缓存数据用于合并
            pendingPrimitives = current;
            
            // 返回空对象，表示本次不输出
            return new InputPrimitives(currentTimeNs);
        }
    }
    
    /**
     * 强制输出待处理的数据
     * @param currentTimeNs 当前时间
     * @return 待处理的输入原语，如果没有则返回 null
     */
    public InputPrimitives flush(long currentTimeNs) {
        if (pendingPrimitives != null) {
            InputPrimitives result = pendingPrimitives;
            pendingPrimitives = null;
            lastOutputTimeNs = currentTimeNs;
            return result;
        }
        return null;
    }
    
    @Override
    public String getStageName() {
        return "MergeStage";
    }
}
