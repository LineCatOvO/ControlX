package com.linecat.wmmtcontroller.core.input.pipeline;

import com.linecat.wmmtcontroller.platform.api.IInputProvider;

/**
 * 输入处理阶段接口
 * 
 * 职责：定义输入管道的处理阶段
 * 实现：NormalizationStage, MergeStage, AbstractionStage
 */
public interface InputStage {
    
    /**
     * 处理输入数据
     * 
     * @param rawInput 原始输入数据
     * @param current 当前处理结果
     * @return 处理后的结果
     */
    InputPrimitives process(IInputProvider.RawInputData rawInput, InputPrimitives current);
    
    /**
     * 获取阶段名称
     * @return 阶段名称
     */
    default String getStageName() {
        return this.getClass().getSimpleName();
    }
}
