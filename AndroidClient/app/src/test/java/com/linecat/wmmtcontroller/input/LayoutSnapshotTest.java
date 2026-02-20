package com.linecat.wmmtcontroller.input;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.*;

/**
 * 布局快照类单元测试
 * 测试布局快照的命中检测和区域管理
 */
public class LayoutSnapshotTest {

    private LayoutSnapshot snapshot;
    private List<Region> regions;

    @Before
    public void setUp() {
        regions = Arrays.asList(
            createRegion("btn1", 0.0f, 0.0f, 0.2f, 0.2f, 1),
            createRegion("btn2", 0.3f, 0.3f, 0.2f, 0.2f, 2),
            createRegion("btn3", 0.6f, 0.6f, 0.2f, 0.2f, 3)
        );
        snapshot = new LayoutSnapshot(regions, 1080f, 1920f);
    }

    /**
     * 测试构造函数
     */
    @Test
    public void testConstructor() {
        assertNotNull("Snapshot should not be null", snapshot);
        assertNotNull("Regions should not be null", snapshot.getRegions());
        assertEquals("Should have 3 regions", 3, snapshot.getRegions().size());
        assertTrue("Timestamp should be > 0", snapshot.timestamp() > 0);
        assertEquals("Screen width should be 1080", 1080f, snapshot.getScreenWidth(), 0.001f);
        assertEquals("Screen height should be 1920", 1920f, snapshot.getScreenHeight(), 0.001f);
    }

    /**
     * 测试命中检测 - 命中 btn1
     */
    @Test
    public void testHitTest_Btn1() {
        Region hit = snapshot.hitTest(0.1f, 0.1f);
        assertNotNull("Should hit btn1", hit);
        assertEquals("Hit region should be btn1", "btn1", hit.getId());
    }

    /**
     * 测试命中检测 - 命中 btn2
     */
    @Test
    public void testHitTest_Btn2() {
        // btn2: left=0.3, top=0.3, right=0.5, bottom=0.5
        Region hit = snapshot.hitTest(0.4f, 0.4f);
        assertNotNull("Should hit btn2", hit);
        assertEquals("Hit region should be btn2", "btn2", hit.getId());
    }

    /**
     * 测试命中检测 - 命中 btn3
     */
    @Test
    public void testHitTest_Btn3() {
        // btn3: left=0.6, top=0.6, right=0.8, bottom=0.8
        Region hit = snapshot.hitTest(0.7f, 0.7f);
        assertNotNull("Should hit btn3", hit);
        assertEquals("Hit region should be btn3", "btn3", hit.getId());
    }

    /**
     * 测试命中检测 - 未命中
     */
    @Test
    public void testHitTest_Miss() {
        Region hit = snapshot.hitTest(0.9f, 0.9f);
        assertNull("Should not hit any region", hit);
    }

    /**
     * 测试命中检测 - 边界情况 (左上角)
     */
    @Test
    public void testHitTest_Boundary_TopLeft() {
        Region hit = snapshot.hitTest(0.0f, 0.0f);
        assertNotNull("Should hit btn1 at boundary", hit);
        assertEquals("Hit region should be btn1", "btn1", hit.getId());
    }

    /**
     * 测试命中检测 - 边界情况 (右下角)
     */
    @Test
    public void testHitTest_Boundary_BottomRight() {
        Region hit = snapshot.hitTest(0.2f, 0.2f);
        assertNotNull("Should hit btn1 at boundary", hit);
        assertEquals("Hit region should be btn1", "btn1", hit.getId());
    }

    /**
     * 测试命中检测 - 重叠区域 (高 zIndex 优先)
     */
    @Test
    public void testHitTest_Overlap() {
        // 创建重叠区域
        List<Region> overlappingRegions = Arrays.asList(
            createRegion("bottom", 0.0f, 0.0f, 0.5f, 0.5f, 1),
            createRegion("top", 0.0f, 0.0f, 0.5f, 0.5f, 2)
        );
        LayoutSnapshot overlappingSnapshot = new LayoutSnapshot(overlappingRegions);
        
        Region hit = overlappingSnapshot.hitTest(0.25f, 0.25f);
        assertNotNull("Should hit overlapping region", hit);
        assertEquals("Should hit top region (higher zIndex)", "top", hit.getId());
    }

    /**
     * 测试通过 ID 获取区域
     */
    @Test
    public void testGetRegionById_Found() {
        Region region = snapshot.getRegionById("btn2");
        assertNotNull("Should find btn2", region);
        assertEquals("Region ID should be btn2", "btn2", region.getId());
    }

    /**
     * 测试通过 ID 获取区域 - 未找到
     */
    @Test
    public void testGetRegionById_NotFound() {
        Region region = snapshot.getRegionById("nonexistent");
        assertNull("Should not find nonexistent region", region);
    }

    /**
     * 测试获取所有区域 (不可变)
     */
    @Test
    public void testGetRegions_Immutable() {
        List<Region> regions = snapshot.getRegions();
        
        assertNotNull("Regions should not be null", regions);
        assertEquals("Should have 3 regions", 3, regions.size());
        
        // 尝试修改应该抛出异常
        try {
            regions.clear();
            fail("Should throw UnsupportedOperationException");
        } catch (UnsupportedOperationException e) {
            // 预期异常
        }
    }

    /**
     * 测试区域按 zIndex 排序
     */
    @Test
    public void testRegionsSortedByZIndex() {
        List<Region> regions = snapshot.getRegions();
        
        // 验证区域按 zIndex 降序排序
        assertEquals("First region should have highest zIndex (btn3)", "btn3", regions.get(0).getId());
        assertEquals("Second region should have middle zIndex (btn2)", "btn2", regions.get(1).getId());
        assertEquals("Third region should have lowest zIndex (btn1)", "btn1", regions.get(2).getId());
    }

    /**
     * 测试空区域列表
     */
    @Test
    public void testEmptyRegions() {
        LayoutSnapshot emptySnapshot = new LayoutSnapshot(Arrays.asList());
        
        assertNotNull("Snapshot should not be null", emptySnapshot);
        assertTrue("Regions should be empty", emptySnapshot.getRegions().isEmpty());
        
        Region hit = emptySnapshot.hitTest(0.5f, 0.5f);
        assertNull("Should not hit any region in empty snapshot", hit);
    }

    /**
     * 测试默认屏幕尺寸
     */
    @Test
    public void testDefaultScreenSize() {
        LayoutSnapshot defaultSnapshot = new LayoutSnapshot(regions);
        
        assertEquals("Default screen width should be 1080", 1080f, defaultSnapshot.getScreenWidth(), 0.001f);
        assertEquals("Default screen height should be 1920", 1920f, defaultSnapshot.getScreenHeight(), 0.001f);
    }

    /**
     * 测试时间戳
     */
    @Test
    public void testTimestamp() {
        long beforeCreate = System.currentTimeMillis();
        LayoutSnapshot newSnapshot = new LayoutSnapshot(regions);
        long afterCreate = System.currentTimeMillis();
        
        long timestamp = newSnapshot.timestamp();
        assertTrue("Timestamp should be >= beforeCreate", timestamp >= beforeCreate);
        assertTrue("Timestamp should be <= afterCreate", timestamp <= afterCreate);
    }

    /**
     * 辅助方法：创建区域
     */
    private Region createRegion(String id, float left, float top, float width, float height, int zIndex) {
        return new Region(
            id,
            Region.RegionType.BUTTON,
            left, top, left + width, top + height,  // 转换为 left, top, right, bottom
            zIndex,
            0.1f,
            "linear",
            new float[]{-1.0f, 1.0f},
            new float[]{-1.0f, 1.0f},
            null, null, null, null, null, null, null
        );
    }
}
