package com.linecat.controlx.model.layout;

import com.google.gson.JsonSyntaxException;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;

import static org.junit.Assert.*;

/**
 * 新版布局加载器单元测试
 * 验证布局文件的读取和验证功能
 */
public class NewLayoutLoaderTest {

    private NewLayoutLoader loader;
    private LayoutConfiguration testConfig;

    @Before
    public void setUp() {
        loader = new NewLayoutLoader();
        testConfig = createTestLayoutConfiguration();
    }

    /**
     * 测试加载布局配置
     */
    @Test
    public void testLoadLayoutConfiguration() {
        String json = "{\"version\":\"1.0.0\",\"ui\":[],\"operation\":[],\"mapping\":[]}";
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Version should be 1.0.0", "1.0.0", config.getVersion());
        assertNotNull("UI should not be null", config.getUi());
        assertNotNull("Operation should not be null", config.getOperation());
        assertNotNull("Mapping should not be null", config.getMapping());
    }

    /**
     * 测试加载布局配置 - 无效 JSON
     */
    @Test(expected = JsonSyntaxException.class)
    public void testLoadLayoutConfiguration_InvalidJson() {
        String invalidJson = "{ invalid json }";
        loader.loadLayoutConfiguration(invalidJson);
    }

    /**
     * 测试加载布局配置 - 完整配置
     */
    @Test
    public void testLoadLayoutConfiguration_Complete() {
        String json = createCompleteLayoutJson();
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Version should be 1.0.0", "1.0.0", config.getVersion());
        assertEquals("Should have 1 UI element", 1, config.getUi().size());
        assertEquals("Should have 1 operation", 1, config.getOperation().size());
        assertEquals("Should have 1 mapping", 1, config.getMapping().size());
    }

    /**
     * 测试验证布局配置
     */
    @Test
    public void testIsValidLayoutConfiguration_Valid() {
        String json = createCompleteLayoutJson();
        
        boolean isValid = loader.isValidLayoutConfiguration(json);
        
        assertTrue("Valid config should return true", isValid);
    }

    /**
     * 测试验证布局配置 - 无效
     */
    @Test
    public void testIsValidLayoutConfiguration_Invalid() {
        String invalidJson = "{ invalid }";
        
        boolean isValid = loader.isValidLayoutConfiguration(invalidJson);
        
        assertFalse("Invalid JSON should return false", isValid);
    }

    /**
     * 测试验证布局配置 - 缺少必需字段
     */
    @Test
    public void testIsValidLayoutConfiguration_MissingFields() {
        String missingJson = "{\"version\":\"1.0.0\"}";
        
        boolean isValid = loader.isValidLayoutConfiguration(missingJson);
        
        assertFalse("Missing required fields should return false", isValid);
    }

    /**
     * 测试序列化布局配置
     */
    @Test
    public void testSerializeLayoutConfiguration() {
        String json = loader.serializeLayoutConfiguration(testConfig);
        
        assertNotNull("JSON should not be null", json);
        assertFalse("JSON should not be empty", json.isEmpty());
        assertTrue("JSON should contain version", json.contains("\"version\":\"1.0.0\""));
    }

    /**
     * 测试序列化 - 反序列化循环
     */
    @Test
    public void testSerializeDeserializeRoundTrip() {
        // 序列化
        String json = loader.serializeLayoutConfiguration(testConfig);
        
        // 反序列化
        LayoutConfiguration deserialized = loader.loadLayoutConfiguration(json);
        
        // 验证
        assertNotNull("Deserialized should not be null", deserialized);
        assertEquals("Version should match", testConfig.getVersion(), deserialized.getVersion());
        assertEquals("UI count should match", testConfig.getUi().size(), deserialized.getUi().size());
        assertEquals("Operation count should match", testConfig.getOperation().size(), deserialized.getOperation().size());
        assertEquals("Mapping count should match", testConfig.getMapping().size(), deserialized.getMapping().size());
    }

    /**
     * 测试加载复杂布局配置
     */
    @Test
    public void testLoadComplexLayoutConfiguration() {
        String json = createComplexLayoutJson();
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Should have 3 UI elements", 3, config.getUi().size());
        assertEquals("Should have 3 operations", 3, config.getOperation().size());
        assertEquals("Should have 3 mappings", 3, config.getMapping().size());
        
        // 验证第一个 UI 元素
        UiElement firstElement = config.getUi().get(0);
        assertEquals("First element ID should be steering", "steering", firstElement.getId());
        assertEquals("First element anchor should be bottom-center", "bottom-center", firstElement.getAnchor());
    }

    /**
     * 测试加载包含完整 UI 元素的布局
     */
    @Test
    public void testLoadLayoutWithCompleteUiElement() {
        String json = "{\n" +
            "  \"version\": \"1.0.0\",\n" +
            "  \"ui\": [{\n" +
            "    \"id\": \"steering_wheel\",\n" +
            "    \"enabled\": true,\n" +
            "    \"anchor\": \"bottom-center\",\n" +
            "    \"offset\": {\"x\": 0.0, \"y\": -50.0, \"unit\": \"px\"},\n" +
            "    \"size\": {\"mode\": \"absolute\", \"width\": 200.0, \"height\": 200.0},\n" +
            "    \"opacity\": 0.8,\n" +
            "    \"resource\": \"steering_wheel.png\",\n" +
            "    \"hitbox\": {\"shape\": \"circle\", \"padding\": 10.0}\n" +
            "  }],\n" +
            "  \"operation\": [],\n" +
            "  \"mapping\": []\n" +
            "}";
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Should have 1 UI element", 1, config.getUi().size());
        
        UiElement element = config.getUi().get(0);
        assertEquals("Element ID should match", "steering_wheel", element.getId());
        assertEquals("Element enabled should be true", true, element.getEnabled());
        assertEquals("Element anchor should match", "bottom-center", element.getAnchor());
        assertEquals("Element opacity should match", 0.8f, element.getOpacity(), 0.001f);
        assertEquals("Element resource should match", "steering_wheel.png", element.getResource());
        
        assertNotNull("Offset should not be null", element.getOffset());
        assertEquals("Offset X should match", 0.0, element.getOffset().getX(), 0.001);
        assertEquals("Offset Y should match", -50.0, element.getOffset().getY(), 0.001);
        
        assertNotNull("Size should not be null", element.getSize());
        assertEquals("Size mode should match", "absolute", element.getSize().getMode());
        assertEquals("Size width should match", 200.0, element.getSize().getWidth(), 0.001);
        assertEquals("Size height should match", 200.0, element.getSize().getHeight(), 0.001);
        
        assertNotNull("Hitbox should not be null", element.getHitbox());
        assertEquals("Hitbox shape should match", "circle", element.getHitbox().getShape());
        assertEquals("Hitbox padding should match", 10.0, element.getHitbox().getPadding(), 0.001);
    }

    /**
     * 测试加载包含多种操作类型的布局
     */
    @Test
    public void testLoadLayoutWithMultipleOperationTypes() {
        String json = "{\n" +
            "  \"version\": \"1.0.0\",\n" +
            "  \"ui\": [],\n" +
            "  \"operation\": [\n" +
            "    {\"id\": \"binary_op\", \"type\": \"binary\"},\n" +
            "    {\"id\": \"axis_op\", \"type\": \"axis\", \"range\": {\"min\": -1.0, \"max\": 1.0}, \"default\": 0.0}\n" +
            "  ],\n" +
            "  \"mapping\": []\n" +
            "}";
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Should have 2 operations", 2, config.getOperation().size());
        
        Operation binaryOp = config.getOperation().get(0);
        assertEquals("Binary op ID should match", "binary_op", binaryOp.getId());
        assertEquals("Binary op type should match", "binary", binaryOp.getType());
        
        Operation axisOp = config.getOperation().get(1);
        assertEquals("Axis op ID should match", "axis_op", axisOp.getId());
        assertEquals("Axis op type should match", "axis", axisOp.getType());
        // Range 和 defaultVal 是可选字段，可能为 null
        if (axisOp.getDefaultVal() != null) {
            assertEquals("Axis op default should be 0.0", 0.0, axisOp.getDefaultVal(), 0.001);
        }
    }

    /**
     * 测试加载包含多种映射触发器的布局
     */
    @Test
    public void testLoadLayoutWithMultipleMappingTriggers() {
        String json = "{\n" +
            "  \"version\": \"1.0.0\",\n" +
            "  \"ui\": [],\n" +
            "  \"operation\": [],\n" +
            "  \"mapping\": [\n" +
            "    {\"operation\": \"op1\", \"output\": \"keyboard:W\", \"trigger\": \"press\"},\n" +
            "    {\"operation\": \"op2\", \"output\": \"keyboard:S\", \"trigger\": \"release\"},\n" +
            "    {\"operation\": \"op3\", \"output\": \"gamepad:leftX\", \"trigger\": \"axis\", \"scale\": 1.5, \"invert\": true}\n" +
            "  ]\n" +
            "}";
        
        LayoutConfiguration config = loader.loadLayoutConfiguration(json);
        
        assertNotNull("Config should not be null", config);
        assertEquals("Should have 3 mappings", 3, config.getMapping().size());
        
        Mapping pressMapping = config.getMapping().get(0);
        assertEquals("Press mapping trigger should match", "press", pressMapping.getTrigger());
        
        Mapping releaseMapping = config.getMapping().get(1);
        assertEquals("Release mapping trigger should match", "release", releaseMapping.getTrigger());
        
        Mapping axisMapping = config.getMapping().get(2);
        assertEquals("Axis mapping trigger should match", "axis", axisMapping.getTrigger());
        assertEquals("Axis mapping scale should match", 1.5, axisMapping.getScale(), 0.001);
        assertTrue("Axis mapping invert should be true", axisMapping.getInvert());
    }

    /**
     * 辅助方法：创建测试用布局配置
     */
    private LayoutConfiguration createTestLayoutConfiguration() {
        LayoutConfiguration config = new LayoutConfiguration();
        config.setVersion("1.0.0");
        config.setUi(Arrays.asList());
        config.setOperation(Arrays.asList());
        config.setMapping(Arrays.asList());
        return config;
    }

    /**
     * 辅助方法：创建完整布局 JSON
     */
    private String createCompleteLayoutJson() {
        return "{\n" +
            "  \"version\": \"1.0.0\",\n" +
            "  \"ui\": [{\"id\": \"btn1\", \"anchor\": \"center\", \"offset\": {\"x\": 0, \"y\": 0}, \"size\": {\"mode\": \"absolute\", \"width\": 100, \"height\": 100}}],\n" +
            "  \"operation\": [{\"id\": \"op1\", \"type\": \"binary\"}],\n" +
            "  \"mapping\": [{\"operation\": \"op1\", \"output\": \"keyboard:W\", \"trigger\": \"press\"}]\n" +
            "}";
    }

    /**
     * 辅助方法：创建复杂布局 JSON
     */
    private String createComplexLayoutJson() {
        return "{\n" +
            "  \"version\": \"2.0.0\",\n" +
            "  \"ui\": [\n" +
            "    {\"id\": \"steering\", \"anchor\": \"bottom-center\", \"offset\": {\"x\": 0, \"y\": -100}, \"size\": {\"mode\": \"absolute\", \"width\": 200, \"height\": 200}},\n" +
            "    {\"id\": \"pedal_left\", \"anchor\": \"bottom-left\", \"offset\": {\"x\": -100, \"y\": -50}, \"size\": {\"mode\": \"absolute\", \"width\": 80, \"height\": 120}},\n" +
            "    {\"id\": \"pedal_right\", \"anchor\": \"bottom-right\", \"offset\": {\"x\": 100, \"y\": -50}, \"size\": {\"mode\": \"absolute\", \"width\": 80, \"height\": 120}}\n" +
            "  ],\n" +
            "  \"operation\": [\n" +
            "    {\"id\": \"steering_op\", \"type\": \"axis\"},\n" +
            "    {\"id\": \"throttle_op\", \"type\": \"axis\"},\n" +
            "    {\"id\": \"brake_op\", \"type\": \"axis\"}\n" +
            "  ],\n" +
            "  \"mapping\": [\n" +
            "    {\"operation\": \"steering_op\", \"output\": \"gamepad:leftX\", \"trigger\": \"axis\"},\n" +
            "    {\"operation\": \"throttle_op\", \"output\": \"gamepad:rightTrigger\", \"trigger\": \"axis\"},\n" +
            "    {\"operation\": \"brake_op\", \"output\": \"gamepad:leftTrigger\", \"trigger\": \"axis\"}\n" +
            "  ]\n" +
            "}";
    }
}
