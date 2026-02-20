package com.linecat.wmmtcontroller.model.layout;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.*;

/**
 * 布局配置类单元测试
 * 测试布局配置的加载和解析
 */
public class LayoutConfigurationTest {

    private LayoutConfiguration config;

    @Before
    public void setUp() {
        config = new LayoutConfiguration();
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        assertNotNull("Config should not be null", config);
        assertNull("Version should be null initially", config.getVersion());
        assertNull("UI elements should be null initially", config.getUi());
        assertNull("Operations should be null initially", config.getOperation());
        assertNull("Mappings should be null initially", config.getMapping());
    }

    /**
     * 测试设置和获取版本
     */
    @Test
    public void testVersionSetterGetter() {
        config.setVersion("1.0.0");
        assertEquals("Version should be 1.0.0", "1.0.0", config.getVersion());
        
        config.setVersion("2.0.0");
        assertEquals("Version should be 2.0.0", "2.0.0", config.getVersion());
    }

    /**
     * 测试设置和获取 UI 元素
     */
    @Test
    public void testUiElementsSetterGetter() {
        List<UiElement> uiElements = Arrays.asList(
            createUiElement("btn1", 0.1f, 0.1f, 0.2f, 0.2f),
            createUiElement("btn2", 0.3f, 0.3f, 0.2f, 0.2f)
        );
        
        config.setUi(uiElements);
        
        assertNotNull("UI elements should not be null", config.getUi());
        assertEquals("Should have 2 UI elements", 2, config.getUi().size());
        assertEquals("First element ID should be btn1", "btn1", config.getUi().get(0).getId());
        assertEquals("Second element ID should be btn2", "btn2", config.getUi().get(1).getId());
    }

    /**
     * 测试设置和获取操作
     */
    @Test
    public void testOperationsSetterGetter() {
        Operation op1 = new Operation();
        op1.setId("op1");
        op1.setType("button");
        
        Operation op2 = new Operation();
        op2.setId("op2");
        op2.setType("axis");
        
        List<Operation> operations = Arrays.asList(op1, op2);
        config.setOperation(operations);
        
        assertNotNull("Operations should not be null", config.getOperation());
        assertEquals("Should have 2 operations", 2, config.getOperation().size());
        assertEquals("First op ID should be op1", "op1", config.getOperation().get(0).getId());
        assertEquals("Second op ID should be op2", "op2", config.getOperation().get(1).getId());
    }

    /**
     * 测试设置和获取映射
     */
    @Test
    public void testMappingsSetterGetter() {
        Mapping map1 = new Mapping();
        map1.setOperation("op1");
        map1.setOutput("keyboard:W");
        map1.setTrigger("press");
        
        List<Mapping> mappings = Arrays.asList(map1);
        config.setMapping(mappings);
        
        assertNotNull("Mappings should not be null", config.getMapping());
        assertEquals("Should have 1 mapping", 1, config.getMapping().size());
        assertEquals("Mapping operation should be op1", "op1", config.getMapping().get(0).getOperation());
    }

    /**
     * 测试完整的布局配置
     */
    @Test
    public void testCompleteConfiguration() {
        // 创建 UI 元素
        UiElement uiElement = createUiElement("steering_wheel", 0.5f, 0.7f, 0.3f, 0.3f);
        
        // 创建操作
        Operation operation = new Operation();
        operation.setId("steer_op");
        operation.setType("axis");
        
        // 创建映射
        Mapping mapping = new Mapping();
        mapping.setOperation("steer_op");
        mapping.setOutput("joystick:x");
        mapping.setTrigger("axis");
        
        // 设置配置
        config.setVersion("1.0.0");
        config.setUi(Arrays.asList(uiElement));
        config.setOperation(Arrays.asList(operation));
        config.setMapping(Arrays.asList(mapping));
        
        // 验证配置
        assertEquals("Version should be 1.0.0", "1.0.0", config.getVersion());
        assertEquals("Should have 1 UI element", 1, config.getUi().size());
        assertEquals("Should have 1 operation", 1, config.getOperation().size());
        assertEquals("Should have 1 mapping", 1, config.getMapping().size());
    }

    /**
     * 测试空配置
     */
    @Test
    public void testEmptyConfiguration() {
        config.setVersion("1.0.0");
        config.setUi(Arrays.asList());
        config.setOperation(Arrays.asList());
        config.setMapping(Arrays.asList());
        
        assertEquals("Version should be 1.0.0", "1.0.0", config.getVersion());
        assertNotNull("UI elements should not be null", config.getUi());
        assertTrue("UI elements should be empty", config.getUi().isEmpty());
        assertTrue("Operations should be empty", config.getOperation().isEmpty());
        assertTrue("Mappings should be empty", config.getMapping().isEmpty());
    }

    /**
     * 测试 UI 元素更新
     */
    @Test
    public void testUiElementUpdate() {
        UiElement element1 = createUiElement("btn1", 0.1f, 0.1f, 0.2f, 0.2f);
        config.setUi(Arrays.asList(element1));
        
        UiElement element2 = createUiElement("btn2", 0.3f, 0.3f, 0.2f, 0.2f);
        config.setUi(Arrays.asList(element1, element2));
        
        assertEquals("Should have 2 UI elements", 2, config.getUi().size());
        assertEquals("Second element should be btn2", "btn2", config.getUi().get(1).getId());
    }

    /**
     * 测试映射配置
     */
    @Test
    public void testMappingConfiguration() {
        Mapping mapping = new Mapping();
        mapping.setOperation("steering");
        mapping.setOutput("gamepad:leftX");
        mapping.setTrigger("axis");
        mapping.setScale(1.5);
        mapping.setInvert(false);
        
        assertEquals("Operation should be steering", "steering", mapping.getOperation());
        assertEquals("Output should be gamepad:leftX", "gamepad:leftX", mapping.getOutput());
        assertEquals("Trigger should be axis", "axis", mapping.getTrigger());
        assertEquals("Scale should be 1.5", 1.5, mapping.getScale(), 0.001);
        assertFalse("Invert should be false", mapping.getInvert());
    }

    /**
     * 测试 Hitbox 配置
     */
    @Test
    public void testHitboxConfiguration() {
        Hitbox hitbox = new Hitbox();
        hitbox.setShape("rect");
        hitbox.setPadding(10.0);
        
        assertEquals("Shape should be rect", "rect", hitbox.getShape());
        assertEquals("Padding should be 10.0", 10.0, hitbox.getPadding(), 0.001);
        
        hitbox.setShape("circle");
        hitbox.setPadding(5.0);
        
        assertEquals("Shape should be circle", "circle", hitbox.getShape());
        assertEquals("Padding should be 5.0", 5.0, hitbox.getPadding(), 0.001);
    }

    /**
     * 辅助方法：创建 UI 元素
     */
    private UiElement createUiElement(String id, float x, float y, float width, float height) {
        UiElement element = new UiElement();
        element.setId(id);
        element.setEnabled(true);
        element.setAnchor("center");
        
        Offset offset = new Offset();
        offset.setX((double)x);
        offset.setY((double)y);
        element.setOffset(offset);
        
        Size size = new Size();
        size.setMode("absolute");
        size.setWidth((double)width);
        size.setHeight((double)height);
        element.setSize(size);
        
        Hitbox hitbox = new Hitbox();
        hitbox.setShape("rect");
        element.setHitbox(hitbox);
        
        return element;
    }
}
