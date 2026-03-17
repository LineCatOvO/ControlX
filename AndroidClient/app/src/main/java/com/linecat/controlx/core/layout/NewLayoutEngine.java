package com.linecat.controlx.core.layout;

import com.linecat.controlx.model.RawInput;
import com.linecat.controlx.model.InputState;
import com.linecat.controlx.input.LayoutSnapshot;
import com.linecat.controlx.migration.LayoutToControlNodeConverter;
import com.linecat.controlx.control.ui.ControlNode;
import com.linecat.controlx.control.mapping.DeviceMapping;
import com.linecat.controlx.control.mapping.ControlLayerCoordinator;

import java.util.List;

/**
 * 新版布局引擎
 * 使用ControlNode、ControlAction、DeviceMapping三层架构
 */
public class NewLayoutEngine {
    
    private ControlLayerCoordinator coordinator;
    private LayoutSnapshot currentLayout;
    
    public NewLayoutEngine(DeviceMapping deviceMapping) {
        this.coordinator = new ControlLayerCoordinator(deviceMapping);
    }
    
    /**
     * 从布局快照加载控制节点
     * @param layoutSnapshot 布局快照
     */
    public void loadLayoutFromSnapshot(LayoutSnapshot layoutSnapshot) {
        this.currentLayout = layoutSnapshot;
        
        // 使用转换器将布局转换为控制节点
        List<ControlNode> controlNodes = LayoutToControlNodeConverter.convertLayoutToControlNodes(layoutSnapshot);
        
        // 清除现有的控制节点
        coordinator.clearControlNodes();
        
        // 添加新的控制节点
        for (ControlNode node : controlNodes) {
            coordinator.addControlNode(node);
        }
    }
    
    /**
     * 执行布局处理
     * @param rawInput 原始输入
     * @param frameId 帧ID
     * @return 输入状态
     */
    public InputState executeLayout(RawInput rawInput, long frameId) {
        InputState inputState = new InputState();
        inputState.setFrameId(frameId);
        
        // 使用协调器处理输入
        coordinator.processInput(rawInput, currentLayout, inputState);
        
        return inputState;
    }
    
    /**
     * 获取当前使用的协调器
     * @return 控制层协调器
     */
    public ControlLayerCoordinator getCoordinator() {
        return coordinator;
    }
    
    /**
     * 更新设备映射
     * @param deviceMapping 新的设备映射
     */
    public void updateDeviceMapping(DeviceMapping deviceMapping) {
        coordinator.setDeviceMapping(deviceMapping);
    }
    
    /**
     * 重置布局引擎
     */
    public void reset() {
        coordinator.clearControlNodes();
        this.currentLayout = null;
    }
}