package com.linecat.wmmtcontroller.core.input.pipeline;

import android.util.Log;

import com.linecat.wmmtcontroller.platform.api.IInputProvider;

import java.util.ArrayList;
import java.util.List;

/**
 * 输入管道
 * 
 * 职责：按顺序执行多个处理阶段，将原始输入转换为抽象输入原语
 * 
 * 处理流程：
 * 1. NormalizationStage - 坐标归一化 (0.0-1.0)
 * 2. MergeStage - MOVE 事件合并 (60Hz)
 * 3. AbstractionStage - 生成输入原语
 */
public class InputPipeline {
    
    private static final String TAG = "InputPipeline";
    
    private final List<InputStage> stages;
    private final List<ProcessingListener> listeners;
    
    /**
     * 处理监听器接口
     */
    public interface ProcessingListener {
        void onPipelineComplete(InputPrimitives result);
    }
    
    /**
     * 构造函数
     */
    public InputPipeline() {
        this.stages = new ArrayList<>();
        this.listeners = new ArrayList<>();
        
        // 初始化默认处理阶段
        initializeStages();
    }
    
    /**
     * 初始化默认处理阶段
     */
    private void initializeStages() {
        // 阶段 1: 归一化
        stages.add(new NormalizationStage());
        
        // 阶段 2: 合并
        stages.add(new MergeStage());
        
        // 阶段 3: 抽象
        stages.add(new AbstractionStage());
    }
    
    /**
     * 添加处理阶段
     * @param stage 处理阶段
     */
    public void addStage(InputStage stage) {
        if (stage != null) {
            stages.add(stage);
            Log.d(TAG, "Added processing stage: " + stage.getStageName());
        }
    }
    
    /**
     * 移除处理阶段
     * @param stage 处理阶段
     */
    public void removeStage(InputStage stage) {
        if (stages.remove(stage)) {
            Log.d(TAG, "Removed processing stage: " + stage.getStageName());
        }
    }
    
    /**
     * 添加处理监听器
     * @param listener 处理监听器
     */
    public void addListener(ProcessingListener listener) {
        if (listener != null && !listeners.contains(listener)) {
            listeners.add(listener);
        }
    }
    
    /**
     * 移除处理监听器
     * @param listener 处理监听器
     */
    public void removeListener(ProcessingListener listener) {
        listeners.remove(listener);
    }
    
    /**
     * 处理原始输入
     * 
     * @param rawInput 原始输入数据
     * @return 处理后的输入原语
     */
    public InputPrimitives process(IInputProvider.RawInputData rawInput) {
        long startTime = System.nanoTime();
        
        InputPrimitives current = new InputPrimitives(rawInput.timestampNs);
        
        // 按顺序执行所有处理阶段
        for (InputStage stage : stages) {
            try {
                current = stage.process(rawInput, current);
            } catch (Exception e) {
                Log.e(TAG, "Error in stage " + stage.getStageName(), e);
                // 继续执行下一个阶段
            }
        }
        
        long processingTime = System.nanoTime() - startTime;
        
        // 通知监听器
        for (ProcessingListener listener : listeners) {
            listener.onPipelineComplete(current);
        }
        
        return current;
    }
    
    /**
     * 获取处理阶段数量
     * @return 阶段数量
     */
    public int getStageCount() {
        return stages.size();
    }
    
    /**
     * 清空所有处理阶段
     */
    public void clearStages() {
        stages.clear();
    }
    
    /**
     * 销毁管道，释放资源
     */
    public void destroy() {
        stages.clear();
        listeners.clear();
    }
}
