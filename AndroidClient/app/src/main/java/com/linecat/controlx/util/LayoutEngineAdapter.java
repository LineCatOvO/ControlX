package com.linecat.controlx.util;

import com.linecat.controlx.input.LayoutEngine;
import com.linecat.controlx.core.layout.EnhancedLayoutEngine;
import com.linecat.controlx.model.RawInput;
import com.linecat.controlx.model.InputState;

/**
 * 布局引擎适配器
 * 用于在新旧架构之间进行适配
 */
public class LayoutEngineAdapter {
    
    private final LayoutEngine legacyEngine;  // 旧版引擎
    private final EnhancedLayoutEngine newEngine;  // 新版引擎
    private boolean useNewEngine = false;  // 控制使用哪个引擎
    
    public LayoutEngineAdapter(LayoutEngine legacyEngine, EnhancedLayoutEngine newEngine) {
        this.legacyEngine = legacyEngine;
        this.newEngine = newEngine;
    }
    
    public InputState executeLayout(RawInput rawInput, long frameId) {
        if (useNewEngine && newEngine != null) {
            return newEngine.executeLayout(rawInput, frameId);
        } else {
            return legacyEngine.executeLayout(rawInput, frameId);
        }
    }
    
    public void setUseNewEngine(boolean useNew) {
        this.useNewEngine = useNew;
    }
    
    public boolean isNewEngineEnabled() {
        return useNewEngine;
    }
}