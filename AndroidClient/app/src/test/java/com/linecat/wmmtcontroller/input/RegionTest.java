package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;

import static org.junit.Assert.*;

/**
 * 区域类单元测试
 * 测试区域的命中检测和属性
 */
public class RegionTest {

    private Region region;

    @Before
    public void setUp() {
        // 使用完整的构造函数创建区域
        region = new Region(
            "test_region",
            Region.RegionType.BUTTON,
            0.1f,  // left
            0.1f,  // top
            0.3f,  // right
            0.3f,  // bottom
            1,     // zIndex
            0.1f,  // deadzone
            "linear", // curve
            new float[]{-1.0f, 1.0f}, // range
            new float[]{-1.0f, 1.0f}, // outputRange
            Region.OperationType.BUTTON,
            Region.MappingType.KEYBOARD,
            "W",
            null,
            null,
            null,
            null
        );
    }

    /**
     * 测试构造函数
     */
    @Test
    public void testConstructor() {
        assertNotNull("Region should not be null", region);
        assertEquals("ID should be test_region", "test_region", region.getId());
        assertEquals("Type should be BUTTON", Region.RegionType.BUTTON, region.getType());
        assertEquals("Left should be 0.1", 0.1f, region.getLeft(), 0.001f);
        assertEquals("Top should be 0.1", 0.1f, region.getTop(), 0.001f);
        assertEquals("Right should be 0.3", 0.3f, region.getRight(), 0.001f);
        assertEquals("Bottom should be 0.3", 0.3f, region.getBottom(), 0.001f);
        assertEquals("ZIndex should be 1", 1, region.getZIndex());
    }

    /**
     * 测试命中检测 - 中心点
     */
    @Test
    public void testHitTest_Center() {
        boolean hit = region.hitTest(0.2f, 0.2f);
        assertTrue("Center point should hit region", hit);
    }

    /**
     * 测试命中检测 - 左上角
     */
    @Test
    public void testHitTest_TopLeft() {
        boolean hit = region.hitTest(0.1f, 0.1f);
        assertTrue("Top-left corner should hit region", hit);
    }

    /**
     * 测试命中检测 - 右下角
     */
    @Test
    public void testHitTest_BottomRight() {
        boolean hit = region.hitTest(0.3f, 0.3f);
        assertTrue("Bottom-right corner should hit region", hit);
    }

    /**
     * 测试命中检测 - 左上方外部
     */
    @Test
    public void testHitTest_AboveLeft() {
        boolean hit = region.hitTest(0.05f, 0.05f);
        assertFalse("Point above-left should not hit region", hit);
    }

    /**
     * 测试命中检测 - 右下方外部
     */
    @Test
    public void testHitTest_BelowRight() {
        boolean hit = region.hitTest(0.35f, 0.35f);
        assertFalse("Point below-right should not hit region", hit);
    }

    /**
     * 测试命中检测 - 左边界
     */
    @Test
    public void testHitTest_LeftEdge() {
        boolean hit = region.hitTest(0.1f, 0.2f);
        assertTrue("Left edge should hit region", hit);
    }

    /**
     * 测试命中检测 - 右边界
     */
    @Test
    public void testHitTest_RightEdge() {
        boolean hit = region.hitTest(0.3f, 0.2f);
        assertTrue("Right edge should hit region", hit);
    }

    /**
     * 测试命中检测 - 上边界
     */
    @Test
    public void testHitTest_TopEdge() {
        boolean hit = region.hitTest(0.2f, 0.1f);
        assertTrue("Top edge should hit region", hit);
    }

    /**
     * 测试命中检测 - 下边界
     */
    @Test
    public void testHitTest_BottomEdge() {
        boolean hit = region.hitTest(0.2f, 0.3f);
        assertTrue("Bottom edge should hit region", hit);
    }

    /**
     * 测试命中检测 - 刚好在外部
     */
    @Test
    public void testHitTest_JustOutside() {
        boolean hitLeft = region.hitTest(0.099f, 0.2f);
        boolean hitRight = region.hitTest(0.301f, 0.2f);
        boolean hitTop = region.hitTest(0.2f, 0.099f);
        boolean hitBottom = region.hitTest(0.2f, 0.301f);
        
        assertFalse("Point just left should not hit", hitLeft);
        assertFalse("Point just right should not hit", hitRight);
        assertFalse("Point just top should not hit", hitTop);
        assertFalse("Point just bottom should not hit", hitBottom);
    }

    /**
     * 测试 Getter 方法
     */
    @Test
    public void testGetters() {
        assertEquals("Deadzone should be 0.1", 0.1f, region.getDeadzone(), 0.001f);
        assertEquals("Curve should be linear", "linear", region.getCurve());
        assertNotNull("Range should not be null", region.getRange());
        assertNotNull("OutputRange should not be null", region.getOutputRange());
        assertEquals("OperationType should be BUTTON", Region.OperationType.BUTTON, region.getOperationType());
        assertEquals("MappingType should be KEYBOARD", Region.MappingType.KEYBOARD, region.getMappingType());
        assertEquals("MappingKey should be W", "W", region.getMappingKey());
    }

    /**
     * 测试全屏幕区域
     */
    @Test
    public void testFullScreenRegion() {
        Region fullScreen = new Region(
            "fullscreen",
            Region.RegionType.BUTTON,
            0.0f, 0.0f, 1.0f, 1.0f, 0,
            0.0f, "linear",
            new float[]{-1.0f, 1.0f},
            new float[]{-1.0f, 1.0f},
            null, null, null, null, null, null, null
        );
        
        assertTrue("Center should hit fullscreen", fullScreen.hitTest(0.5f, 0.5f));
        assertTrue("Corner should hit fullscreen", fullScreen.hitTest(0.0f, 0.0f));
        assertTrue("Opposite corner should hit fullscreen", fullScreen.hitTest(1.0f, 1.0f));
    }

    /**
     * 测试 contains 方法 (兼容旧方法名)
     */
    @Test
    public void testContains() {
        boolean contains = region.contains(0.2f, 0.2f);
        assertTrue("Center point should be contained", contains);
        
        boolean notContains = region.contains(0.5f, 0.5f);
        assertFalse("Outside point should not be contained", notContains);
    }

    /**
     * 测试 getCenter 方法
     */
    @Test
    public void testGetCenter() {
        float[] center = region.getCenter();
        
        assertNotNull("Center should not be null", center);
        assertEquals("Center length should be 2", 2, center.length);
        assertEquals("Center X should be 0.2", 0.2f, center[0], 0.001f);
        assertEquals("Center Y should be 0.2", 0.2f, center[1], 0.001f);
    }

    /**
     * 测试 toString 方法
     */
    @Test
    public void testToString() {
        String str = region.toString();
        
        assertNotNull("toString should not return null", str);
        assertTrue("toString should contain region ID", str.contains("test_region"));
        assertTrue("toString should contain type", str.contains("BUTTON"));
    }
}
