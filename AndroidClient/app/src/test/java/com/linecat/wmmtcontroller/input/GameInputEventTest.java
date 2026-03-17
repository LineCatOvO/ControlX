package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;

import static org.junit.Assert.*;

/**
 * GameInputEvent 类单元测试
 * 测试游戏输入事件类的各项功能
 */
public class GameInputEventTest {

    private GameInputEvent event;

    @Before
    public void setUp() {
        event = new GameInputEvent("A", GameInputEvent.EventType.PRESS);
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        assertNotNull("Event should not be null", event);
        assertEquals("Key should be A", "A", event.getKey());
        assertEquals("Type should be PRESS", GameInputEvent.EventType.PRESS, event.getType());
        assertNotNull("Timestamp should be set", event.getTimestamp());
        assertTrue("Timestamp should be in the recent past", 
                event.getTimestamp() <= System.currentTimeMillis());
    }

    /**
     * 测试所有事件类型
     */
    @Test
    public void testAllEventTypes() {
        // 测试 PRESS
        GameInputEvent pressEvent = new GameInputEvent("A", GameInputEvent.EventType.PRESS);
        assertEquals("Type should be PRESS", GameInputEvent.EventType.PRESS, pressEvent.getType());
        
        // 测试 RELEASE
        GameInputEvent releaseEvent = new GameInputEvent("A", GameInputEvent.EventType.RELEASE);
        assertEquals("Type should be RELEASE", GameInputEvent.EventType.RELEASE, releaseEvent.getType());
        
        // 测试 TAP
        GameInputEvent tapEvent = new GameInputEvent("A", GameInputEvent.EventType.TAP);
        assertEquals("Type should be TAP", GameInputEvent.EventType.TAP, tapEvent.getType());
        
        // 测试 LONG_PRESS
        GameInputEvent longPressEvent = new GameInputEvent("A", GameInputEvent.EventType.LONG_PRESS);
        assertEquals("Type should be LONG_PRESS", GameInputEvent.EventType.LONG_PRESS, longPressEvent.getType());
    }

    /**
     * 测试 Key 设置和获取
     */
    @Test
    public void testKeySetterGetter() {
        event.setKey("B");
        assertEquals("Key should be B", "B", event.getKey());
        
        event.setKey("X");
        assertEquals("Key should be X", "X", event.getKey());
        
        event.setKey("Y");
        assertEquals("Key should be Y", "Y", event.getKey());
    }

    /**
     * 测试 Type 设置和获取
     */
    @Test
    public void testTypeSetterGetter() {
        event.setType(GameInputEvent.EventType.RELEASE);
        assertEquals("Type should be RELEASE", GameInputEvent.EventType.RELEASE, event.getType());
        
        event.setType(GameInputEvent.EventType.TAP);
        assertEquals("Type should be TAP", GameInputEvent.EventType.TAP, event.getType());
        
        event.setType(GameInputEvent.EventType.LONG_PRESS);
        assertEquals("Type should be LONG_PRESS", GameInputEvent.EventType.LONG_PRESS, event.getType());
    }

    /**
     * 测试 Timestamp 设置和获取
     */
    @Test
    public void testTimestampSetterGetter() {
        long customTimestamp = 1234567890L;
        event.setTimestamp(customTimestamp);
        
        assertEquals("Timestamp should be 1234567890", customTimestamp, event.getTimestamp());
    }

    /**
     * 测试时间戳自动设置
     */
    @Test
    public void testTimestampAutoSet() {
        long beforeCreate = System.currentTimeMillis();
        GameInputEvent newEvent = new GameInputEvent("Z", GameInputEvent.EventType.PRESS);
        long afterCreate = System.currentTimeMillis();
        
        assertTrue("Timestamp should be >= beforeCreate", newEvent.getTimestamp() >= beforeCreate);
        assertTrue("Timestamp should be <= afterCreate", newEvent.getTimestamp() <= afterCreate);
    }

    /**
     * 测试 toString 方法
     */
    @Test
    public void testToString() {
        String str = event.toString();
        
        assertNotNull("toString should not return null", str);
        assertTrue("toString should contain key", str.contains("key"));
        assertTrue("toString should contain type", str.contains("type"));
        assertTrue("toString should contain timestamp", str.contains("timestamp"));
        assertTrue("toString should contain 'A'", str.contains("'A'"));
        assertTrue("toString should contain 'PRESS'", str.contains("PRESS"));
    }

    /**
     * 测试特殊按键名称
     */
    @Test
    public void testSpecialKeyNames() {
        // 测试组合键名称
        GameInputEvent comboEvent = new GameInputEvent("Ctrl+A", GameInputEvent.EventType.PRESS);
        assertEquals("Key should be Ctrl+A", "Ctrl+A", comboEvent.getKey());
        
        // 测试功能键名称
        GameInputEvent funcEvent = new GameInputEvent("F1", GameInputEvent.EventType.PRESS);
        assertEquals("Key should be F1", "F1", funcEvent.getKey());
        
        // 测试方向键名称
        GameInputEvent dirEvent = new GameInputEvent("ArrowUp", GameInputEvent.EventType.PRESS);
        assertEquals("Key should be ArrowUp", "ArrowUp", dirEvent.getKey());
    }

    /**
     * 测试空键名
     */
    @Test
    public void testEmptyKeyName() {
        GameInputEvent emptyEvent = new GameInputEvent("", GameInputEvent.EventType.PRESS);
        assertEquals("Key should be empty string", "", emptyEvent.getKey());
    }

    /**
     * 测试 null 键名
     */
    @Test
    public void testNullKeyName() {
        GameInputEvent nullEvent = new GameInputEvent(null, GameInputEvent.EventType.PRESS);
        assertNull("Key should be null", nullEvent.getKey());
    }

    /**
     * 测试按键名称修改
     */
    @Test
    public void testKeyModification() {
        String originalKey = event.getKey();
        event.setKey("NewKey");
        String newKey = event.getKey();
        
        assertNotEquals("Key should be different after modification", originalKey, newKey);
        assertEquals("Key should be NewKey", "NewKey", newKey);
    }

    /**
     * 测试事件类型修改
     */
    @Test
    public void testTypeModification() {
        GameInputEvent.EventType originalType = event.getType();
        event.setType(GameInputEvent.EventType.RELEASE);
        GameInputEvent.EventType newType = event.getType();
        
        assertNotEquals("Type should be different after modification", originalType, newType);
        assertEquals("Type should be RELEASE", GameInputEvent.EventType.RELEASE, newType);
    }

    /**
     * 测试时间戳修改
     */
    @Test
    public void testTimestampModification() {
        long originalTimestamp = event.getTimestamp();
        event.setTimestamp(9999999999L);
        long newTimestamp = event.getTimestamp();
        
        assertNotEquals("Timestamp should be different after modification", originalTimestamp, newTimestamp);
        assertEquals("Timestamp should be 9999999999", 9999999999L, newTimestamp);
    }

    /**
     * 测试 Unicode 按键名称
     */
    @Test
    public void testUnicodeKeyName() {
        GameInputEvent unicodeEvent = new GameInputEvent("按键", GameInputEvent.EventType.PRESS);
        assertEquals("Key should support Unicode", "按键", unicodeEvent.getKey());
        
        GameInputEvent emojiEvent = new GameInputEvent("🎮", GameInputEvent.EventType.PRESS);
        assertEquals("Key should support emoji", "🎮", emojiEvent.getKey());
    }

    /**
     * 测试长按键名称
     */
    @Test
    public void testLongKeyName() {
        StringBuilder longKeyName = new StringBuilder();
        for (int i = 0; i < 100; i++) {
            longKeyName.append("K");
        }
        
        GameInputEvent longEvent = new GameInputEvent(longKeyName.toString(), GameInputEvent.EventType.PRESS);
        assertEquals("Long key name should be supported", longKeyName.toString(), longEvent.getKey());
    }

    /**
     * 测试事件不变性
     */
    @Test
    public void testEventMutability() {
        GameInputEvent event1 = new GameInputEvent("A", GameInputEvent.EventType.PRESS);
        GameInputEvent event2 = event1;
        
        // 修改 event2 应该影响 event1（因为是同一个对象）
        event2.setKey("B");
        assertEquals("event1 key should also be B", "B", event1.getKey());
    }

    /**
     * 测试创建多个事件实例
     */
    @Test
    public void testMultipleInstances() {
        GameInputEvent event1 = new GameInputEvent("A", GameInputEvent.EventType.PRESS);
        GameInputEvent event2 = new GameInputEvent("B", GameInputEvent.EventType.RELEASE);
        GameInputEvent event3 = new GameInputEvent("X", GameInputEvent.EventType.TAP);
        
        // 验证各个事件独立
        assertEquals("Event1 key should be A", "A", event1.getKey());
        assertEquals("Event2 key should be B", "B", event2.getKey());
        assertEquals("Event3 key should be X", "X", event3.getKey());
        
    }

    /**
     * 测试 EventType 枚举值
     */
    @Test
    public void testEventTypeEnumValues() {
        // 验证所有枚举值都存在
        GameInputEvent.EventType[] values = GameInputEvent.EventType.values();
        assertEquals("Should have 4 event types", 4, values.length);
        
        // 验证 valueOf 方法
        assertEquals("valueOf PRESS should work", 
                GameInputEvent.EventType.PRESS, GameInputEvent.EventType.valueOf("PRESS"));
        assertEquals("valueOf RELEASE should work", 
                GameInputEvent.EventType.RELEASE, GameInputEvent.EventType.valueOf("RELEASE"));
        assertEquals("valueOf TAP should work", 
                GameInputEvent.EventType.TAP, GameInputEvent.EventType.valueOf("TAP"));
        assertEquals("valueOf LONG_PRESS should work", 
                GameInputEvent.EventType.LONG_PRESS, GameInputEvent.EventType.valueOf("LONG_PRESS"));
    }

    /**
     * 测试事件链式设置（模拟）
     */
    @Test
    public void testEventChaining() {
        // 虽然不支持链式调用，但可以测试连续设置
        event.setKey("A");
        event.setType(GameInputEvent.EventType.PRESS);
        event.setTimestamp(1000L);
        
        assertEquals("Key should be A", "A", event.getKey());
        assertEquals("Type should be PRESS", GameInputEvent.EventType.PRESS, event.getType());
        assertEquals("Timestamp should be 1000", 1000L, event.getTimestamp());
    }

    /**
     * 测试事件时间戳顺序
     */
    @Test
    public void testTimestampOrdering() {
        GameInputEvent event1 = new GameInputEvent("A", GameInputEvent.EventType.PRESS);
        
        try {
            Thread.sleep(10);
        } catch (InterruptedException e) {
            // 忽略
        }
        
        GameInputEvent event2 = new GameInputEvent("B", GameInputEvent.EventType.RELEASE);
        
        assertTrue("Event2 timestamp should be >= Event1 timestamp", 
                event2.getTimestamp() >= event1.getTimestamp());
    }
}
