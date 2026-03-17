package com.linecat.controlx.model.layout;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.*;

/**
 * 布局序列化器单元测试
 * 验证布局文件的读取（反序列化）和存储（序列化）功能
 */
public class LayoutSerializerTest {

    private LayoutConfiguration config;

    @Before
    public void setUp() {
        config = createTestLayoutConfiguration();
    }

    /**
     * 测试序列化功能
     */
    @Test
    public void testSerialize() {
        String json = LayoutSerializer.serialize(config);
        
        assertNotNull("JSON should not be null", json);
        assertFalse("JSON should not be empty", json.isEmpty());
        assertTrue("JSON should contain version", json.contains("\"version\""));
        assertTrue("JSON should contain ui", json.contains("\"ui\""));
        assertTrue("JSON should contain operation", json.contains("\"operation\""));
        assertTrue("JSON should contain mapping", json.contains("\"mapping\""));
    }

    /**
     * 测试反序列化功能
     */
    @Test
    public void testDeserialize() {
        String json = LayoutSerializer.serialize(config);
        
        LayoutConfiguration deserialized = LayoutSerializer.deserialize(json);
        
        assertNotNull("Deserialized config should not be null", deserialized);
        assertEquals("Version should match", config.getVersion(), deserialized.getVersion());
        assertNotNull("UI elements should not be null", deserialized.getUi());
        assertEquals("UI element count should match", config.getUi().size(), deserialized.getUi().size());
        assertNotNull("Operations should not be null", deserialized.getOperation());
        assertNotNull("Mappings should not be null", deserialized.getMapping());
    }

    /**
     * 测试序列化 - 反序列化循环
     */
    @Test
    public void testSerializeDeserializeRoundTrip() {
        // 原始配置
        LayoutConfiguration original = createTestLayoutConfiguration();
        
        // 序列化
        String json = LayoutSerializer.serialize(original);
        
        // 反序列化
        LayoutConfiguration deserialized = LayoutSerializer.deserialize(json);
        
        // 验证数据完整性
        assertEquals("Version should match", original.getVersion(), deserialized.getVersion());
        assertEquals("UI element count should match", original.getUi().size(), deserialized.getUi().size());
        assertEquals("Operation count should match", original.getOperation().size(), deserialized.getOperation().size());
        assertEquals("Mapping count should match", original.getMapping().size(), deserialized.getMapping().size());
    }

    /**
     * 测试验证布局配置格式
     */
    @Test
    public void testIsValidLayoutConfig_Valid() {
        String validJson = LayoutSerializer.serialize(config);
        
        boolean isValid = LayoutSerializer.isValidLayoutConfig(validJson);
        
        assertTrue("Valid config should return true", isValid);
    }

    /**
     * 测试验证布局配置格式 - 无效 JSON
     */
    @Test
    public void testIsValidLayoutConfig_InvalidJson() {
        String invalidJson = "{ invalid json }";
        
        boolean isValid = LayoutSerializer.isValidLayoutConfig(invalidJson);
        
        assertFalse("Invalid JSON should return false", isValid);
    }

    /**
     * 测试验证布局配置格式 - 缺少必需字段
     */
    @Test
    public void testIsValidLayoutConfig_MissingFields() {
        String missingFieldsJson = "{\"version\": \"1.0.0\"}";
        
        boolean isValid = LayoutSerializer.isValidLayoutConfig(missingFieldsJson);
        
        assertFalse("Missing required fields should return false", isValid);
    }

    /**
     * 测试验证版本号格式
     */
    @Test
    public void testIsValidVersion() {
        assertTrue("1.0.0 should be valid", LayoutSerializer.isValidVersion("1.0.0"));
        assertTrue("2.1.3 should be valid", LayoutSerializer.isValidVersion("2.1.3"));
        assertTrue("10.20.30 should be valid", LayoutSerializer.isValidVersion("10.20.30"));
    }

    /**
     * 测试验证版本号格式 - 无效版本
     */
    @Test
    public void testIsValidVersion_Invalid() {
        assertFalse("Null should be invalid", LayoutSerializer.isValidVersion(null));
        assertFalse("Empty string should be invalid", LayoutSerializer.isValidVersion(""));
        assertFalse("1.0 should be invalid", LayoutSerializer.isValidVersion("1.0"));
        assertFalse("1.0.0.0 should be invalid", LayoutSerializer.isValidVersion("1.0.0.0"));
        assertFalse("abc should be invalid", LayoutSerializer.isValidVersion("abc"));
    }

    /**
     * 测试复杂布局配置序列化
     */
    @Test
    public void testComplexLayoutSerialization() {
        LayoutConfiguration complexConfig = createComplexLayoutConfiguration();
        
        String json = LayoutSerializer.serialize(complexConfig);
        LayoutConfiguration deserialized = LayoutSerializer.deserialize(json);
        
        assertNotNull("Deserialized complex config should not be null", deserialized);
        assertEquals("UI element count should match", complexConfig.getUi().size(), deserialized.getUi().size());
        assertEquals("Operation count should match", complexConfig.getOperation().size(), deserialized.getOperation().size());
        assertEquals("Mapping count should match", complexConfig.getMapping().size(), deserialized.getMapping().size());
    }

    /**
     * 测试空布局配置
     */
    @Test
    public void testEmptyLayoutConfiguration() {
        LayoutConfiguration emptyConfig = new LayoutConfiguration();
        emptyConfig.setVersion("1.0.0");
        emptyConfig.setUi(Arrays.asList());
        emptyConfig.setOperation(Arrays.asList());
        emptyConfig.setMapping(Arrays.asList());
        
        String json = LayoutSerializer.serialize(emptyConfig);
        LayoutConfiguration deserialized = LayoutSerializer.deserialize(json);
        
        assertNotNull("Deserialized empty config should not be null", deserialized);
        assertTrue("UI elements should be empty", deserialized.getUi().isEmpty());
        assertTrue("Operations should be empty", deserialized.getOperation().isEmpty());
        assertTrue("Mappings should be empty", deserialized.getMapping().isEmpty());
    }

    /**
     * 测试布局配置包含完整 UI 元素
     */
    @Test
    public void testLayoutWithCompleteUiElement() {
        LayoutConfiguration config = new LayoutConfiguration();
        config.setVersion("1.0.0");
        
        UiElement element = new UiElement();
        element.setId("steering_wheel");
        element.setEnabled(true);
        element.setAnchor("bottom-center");
        element.setOpacity(0.8f);
        element.setResource("steering_wheel.png");
        
        Offset offset = new Offset();
        offset.setX(0.0);
        offset.setY(-50.0);
        offset.setUnit("px");
        element.setOffset(offset);
        
        Size size = new Size();
        size.setMode("absolute");
        size.setWidth(200.0);
        size.setHeight(200.0);
        element.setSize(size);
        
        Hitbox hitbox = new Hitbox();
        hitbox.setShape("circle");
        hitbox.setPadding(10.0);
        element.setHitbox(hitbox);
        
        config.setUi(Arrays.asList(element));
        config.setOperation(Arrays.asList());
        config.setMapping(Arrays.asList());
        
        String json = LayoutSerializer.serialize(config);
        LayoutConfiguration deserialized = LayoutSerializer.deserialize(json);
        
        assertNotNull("Deserialized config should not be null", deserialized);
        assertEquals("Should have 1 UI element", 1, deserialized.getUi().size());
        
        UiElement deserializedElement = deserialized.getUi().get(0);
        assertEquals("Element ID should match", "steering_wheel", deserializedElement.getId());
        assertEquals("Element anchor should match", "bottom-center", deserializedElement.getAnchor());
        assertEquals("Element opacity should match", 0.8f, deserializedElement.getOpacity(), 0.001f);
        assertNotNull("Element offset should not be null", deserializedElement.getOffset());
        assertNotNull("Element size should not be null", deserializedElement.getSize());
        assertNotNull("Element hitbox should not be null", deserializedElement.getHitbox());
    }

    /**
     * 辅助方法：创建测试用布局配置
     */
    private LayoutConfiguration createTestLayoutConfiguration() {
        LayoutConfiguration config = new LayoutConfiguration();
        config.setVersion("1.0.0");
        
        // 创建 UI 元素
        UiElement uiElement = new UiElement();
        uiElement.setId("btn1");
        uiElement.setAnchor("center");
        
        Offset offset = new Offset();
        offset.setX(0.0);
        offset.setY(0.0);
        uiElement.setOffset(offset);
        
        Size size = new Size();
        size.setMode("absolute");
        size.setWidth(100.0);
        size.setHeight(100.0);
        uiElement.setSize(size);
        
        config.setUi(Arrays.asList(uiElement));
        
        // 创建操作
        Operation operation = new Operation();
        operation.setId("op1");
        operation.setType("binary");
        config.setOperation(Arrays.asList(operation));
        
        // 创建映射
        Mapping mapping = new Mapping();
        mapping.setOperation("op1");
        mapping.setOutput("keyboard:W");
        mapping.setTrigger("press");
        config.setMapping(Arrays.asList(mapping));
        
        return config;
    }

    /**
     * 辅助方法：创建复杂布局配置
     */
    private LayoutConfiguration createComplexLayoutConfiguration() {
        LayoutConfiguration config = new LayoutConfiguration();
        config.setVersion("2.0.0");
        
        // 创建多个 UI 元素
        UiElement element1 = createUiElement("steering", "bottom-center", 0.0, -100.0, 200.0, 200.0);
        UiElement element2 = createUiElement("pedal_left", "bottom-left", -100.0, -50.0, 80.0, 120.0);
        UiElement element3 = createUiElement("pedal_right", "bottom-right", 100.0, -50.0, 80.0, 120.0);
        
        config.setUi(Arrays.asList(element1, element2, element3));
        
        // 创建多个操作
        Operation op1 = createOperation("steering_op", "axis");
        Operation op2 = createOperation("throttle_op", "axis");
        Operation op3 = createOperation("brake_op", "axis");
        
        config.setOperation(Arrays.asList(op1, op2, op3));
        
        // 创建多个映射
        Mapping map1 = createMapping("steering_op", "gamepad:leftX", "axis");
        Mapping map2 = createMapping("throttle_op", "gamepad:rightTrigger", "axis");
        Mapping map3 = createMapping("brake_op", "gamepad:leftTrigger", "axis");
        
        config.setMapping(Arrays.asList(map1, map2, map3));
        
        return config;
    }

    /**
     * 辅助方法：创建 UI 元素
     */
    private UiElement createUiElement(String id, String anchor, double x, double y, double width, double height) {
        UiElement element = new UiElement();
        element.setId(id);
        element.setEnabled(true);
        element.setAnchor(anchor);
        element.setOpacity(1.0f);
        
        Offset offset = new Offset();
        offset.setX(x);
        offset.setY(y);
        offset.setUnit("px");
        element.setOffset(offset);
        
        Size size = new Size();
        size.setMode("absolute");
        size.setWidth(width);
        size.setHeight(height);
        element.setSize(size);
        
        Hitbox hitbox = new Hitbox();
        hitbox.setShape("rect");
        hitbox.setPadding(0.0);
        element.setHitbox(hitbox);
        
        return element;
    }

    /**
     * 辅助方法：创建操作
     */
    private Operation createOperation(String id, String type) {
        Operation operation = new Operation();
        operation.setId(id);
        operation.setType(type);
        return operation;
    }

    /**
     * 辅助方法：创建映射
     */
    private Mapping createMapping(String operation, String output, String trigger) {
        Mapping mapping = new Mapping();
        mapping.setOperation(operation);
        mapping.setOutput(output);
        mapping.setTrigger(trigger);
        mapping.setScale(1.0);
        mapping.setInvert(false);
        return mapping;
    }
}
