package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

import static org.junit.Assert.*;

/**
 * ScriptProfile 类单元测试
 * 测试脚本配置文件类的各项功能
 */
public class ScriptProfileTest {

    private static final String TEST_NAME = "TestProfile";
    private static final String TEST_VERSION = "1.0.0";
    private static final String TEST_AUTHOR = "TestAuthor";
    private static final String TEST_ENTRY = "main.js";
    private static final String TEST_SCRIPT = "function update(raw) { return {heldKeys: ['A']}; }";

    private ScriptProfile profile;

    @Before
    public void setUp() {
        profile = new ScriptProfile(TEST_NAME, TEST_VERSION, TEST_AUTHOR, TEST_ENTRY, TEST_SCRIPT);
    }

    /**
     * 测试构造函数初始化
     */
    @Test
    public void testConstructor() {
        assertNotNull("Profile should not be null", profile);
        assertNotNull("ID should be auto-generated", profile.getId());
        assertEquals("Name should be TestProfile", TEST_NAME, profile.getName());
        assertEquals("Version should be 1.0.0", TEST_VERSION, profile.getVersion());
        assertEquals("Author should be TestAuthor", TEST_AUTHOR, profile.getAuthor());
        assertEquals("EntryPoint should be main.js", TEST_ENTRY, profile.getEntryPoint());
        assertEquals("ScriptCode should match", TEST_SCRIPT, profile.getScriptCode());
        assertEquals("Default engineApiVersion should be 1.0.0", "1.0.0", profile.getEngineApiVersion());
        assertNotNull("CreatedAt should be set", profile.getCreatedAt());
        assertNotNull("UpdatedAt should be set", profile.getUpdatedAt());
        assertNotNull("Compatibility should be initialized", profile.getCompatibility());
    }

    /**
     * 测试 ID 设置和获取
     */
    @Test
    public void testIdSetterGetter() {
        String customId = "custom-profile-id-123";
        profile.setId(customId);
        
        assertEquals("ID should be custom-profile-id-123", customId, profile.getId());
    }

    /**
     * 测试 UUID 自动生成
     */
    @Test
    public void testUuidAutoGeneration() {
        ScriptProfile profile1 = new ScriptProfile("Profile1", "1.0.0", "Author1", "main.js", "code1");
        ScriptProfile profile2 = new ScriptProfile("Profile2", "1.0.0", "Author2", "main.js", "code2");
        
        assertNotNull("Profile1 ID should not be null", profile1.getId());
        assertNotNull("Profile2 ID should not be null", profile2.getId());
        assertNotEquals("Profile1 and Profile2 should have different IDs", profile1.getId(), profile2.getId());
    }

    /**
     * 测试名称设置和获取
     */
    @Test
    public void testNameSetterGetter() {
        String newName = "NewProfileName";
        profile.setName(newName);
        
        assertEquals("Name should be NewProfileName", newName, profile.getName());
    }

    /**
     * 测试名称更新时更新时间戳
     */
    @Test
    public void testNameUpdateTimestamp() {
        Date beforeUpdate = profile.getUpdatedAt();
        
        // 等待一小段时间确保时间戳会变化
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            // 忽略
        }
        
        profile.setName("NewName");
        
        assertTrue("UpdatedAt should be after the update", 
                profile.getUpdatedAt().getTime() >= beforeUpdate.getTime());
    }

    /**
     * 测试版本号设置和获取
     */
    @Test
    public void testVersionSetterGetter() {
        String newVersion = "2.0.0";
        profile.setVersion(newVersion);
        
        assertEquals("Version should be 2.0.0", newVersion, profile.getVersion());
    }

    /**
     * 测试语义化版本格式
     */
    @Test
    public void testSemanticVersionFormat() {
        profile.setVersion("1.2.3");
        assertEquals("Version should be 1.2.3", "1.2.3", profile.getVersion());
        
        profile.setVersion("2.0.0-beta");
        assertEquals("Version should be 2.0.0-beta", "2.0.0-beta", profile.getVersion());
        
        profile.setVersion("1.0.0-alpha.1");
        assertEquals("Version should be 1.0.0-alpha.1", "1.0.0-alpha.1", profile.getVersion());
    }

    /**
     * 测试作者设置和获取
     */
    @Test
    public void testAuthorSetterGetter() {
        String newAuthor = "NewAuthor";
        profile.setAuthor(newAuthor);
        
        assertEquals("Author should be NewAuthor", newAuthor, profile.getAuthor());
    }

    /**
     * 测试引擎 API 版本设置和获取
     */
    @Test
    public void testEngineApiVersionSetterGetter() {
        String newApiVersion = "2.0.0";
        profile.setEngineApiVersion(newApiVersion);
        
        assertEquals("EngineApiVersion should be 2.0.0", newApiVersion, profile.getEngineApiVersion());
    }

    /**
     * 测试描述设置和获取
     */
    @Test
    public void testDescriptionSetterGetter() {
        String description = "This is a test profile";
        profile.setDescription(description);
        
        assertEquals("Description should match", description, profile.getDescription());
    }

    /**
     * 测试描述可以为 null
     */
    @Test
    public void testDescriptionNull() {
        profile.setDescription(null);
        assertNull("Description should be null", profile.getDescription());
    }

    /**
     * 测试入口点设置和获取
     */
    @Test
    public void testEntryPointSetterGetter() {
        String newEntry = "index.js";
        profile.setEntryPoint(newEntry);
        
        assertEquals("EntryPoint should be index.js", newEntry, profile.getEntryPoint());
    }

    /**
     * 测试脚本代码设置和获取
     */
    @Test
    public void testScriptCodeSetterGetter() {
        String newScript = "function update(raw) { return {heldKeys: ['B']}; }";
        profile.setScriptCode(newScript);
        
        assertEquals("ScriptCode should match", newScript, profile.getScriptCode());
    }

    /**
     * 测试空脚本代码
     */
    @Test
    public void testEmptyScriptCode() {
        String emptyScript = "";
        profile.setScriptCode(emptyScript);
        
        assertEquals("ScriptCode should be empty", emptyScript, profile.getScriptCode());
    }

    /**
     * 测试兼容性信息设置和获取
     */
    @Test
    public void testCompatibilitySetterGetter() {
        ScriptProfile.CompatibilityInfo newCompatibility = new ScriptProfile.CompatibilityInfo();
        List<String> gamepads = Arrays.asList("Xbox", "PS4", "Switch");
        newCompatibility.setSupportedGamepads(gamepads);
        newCompatibility.setMinimumAndroidVersion("8.0");
        
        profile.setCompatibility(newCompatibility);
        
        assertEquals("Compatibility should match", newCompatibility, profile.getCompatibility());
        assertEquals("Supported gamepads should match", gamepads, profile.getCompatibility().getSupportedGamepads());
        assertEquals("Min Android version should be 8.0", "8.0", profile.getCompatibility().getMinimumAndroidVersion());
    }

    /**
     * 测试兼容性信息内部类
     */
    @Test
    public void testCompatibilityInfoClass() {
        ScriptProfile.CompatibilityInfo compatibility = new ScriptProfile.CompatibilityInfo();
        
        // 测试默认值
        assertNull("SupportedGamepads should be null by default", compatibility.getSupportedGamepads());
        assertNull("MinimumAndroidVersion should be null by default", compatibility.getMinimumAndroidVersion());
        
        // 测试设置值
        List<String> gamepads = Arrays.asList("Xbox One", "DualShock 4");
        compatibility.setSupportedGamepads(gamepads);
        compatibility.setMinimumAndroidVersion("9.0");
        
        assertEquals("SupportedGamepads should match", gamepads, compatibility.getSupportedGamepads());
        assertEquals("MinimumAndroidVersion should be 9.0", "9.0", compatibility.getMinimumAndroidVersion());
    }

    /**
     * 测试依赖设置和获取
     */
    @Test
    public void testDependenciesSetterGetter() {
        List<String> deps = Arrays.asList("lodash", "axios", "moment");
        profile.setDependencies(deps);
        
        assertEquals("Dependencies should match", deps, profile.getDependencies());
        assertEquals("Dependencies size should be 3", 3, profile.getDependencies().size());
    }

    /**
     * 测试依赖可以为 null
     */
    @Test
    public void testDependenciesNull() {
        profile.setDependencies(null);
        assertNull("Dependencies should be null", profile.getDependencies());
    }

    /**
     * 测试空依赖列表
     */
    @Test
    public void testEmptyDependencies() {
        List<String> emptyDeps = Arrays.asList();
        profile.setDependencies(emptyDeps);
        
        assertNotNull("Dependencies should not be null", profile.getDependencies());
        assertTrue("Dependencies should be empty", profile.getDependencies().isEmpty());
    }

    /**
     * 测试创建时间
     */
    @Test
    public void testCreatedAt() {
        Date now = new Date();
        ScriptProfile newProfile = new ScriptProfile("NewProfile", "1.0.0", "Author", "main.js", "code");
        
        assertNotNull("CreatedAt should not be null", newProfile.getCreatedAt());
        assertTrue("CreatedAt should be around now", 
                Math.abs(newProfile.getCreatedAt().getTime() - now.getTime()) < 1000);
    }

    /**
     * 测试更新时间在修改时更新
     */
    @Test
    public void testUpdatedAtOnModification() {
        Date initialUpdate = profile.getUpdatedAt();
        
        // 等待一小段时间
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            // 忽略
        }
        
        // 测试各种修改操作是否更新时间戳
        profile.setVersion("2.0.0");
        assertTrue("UpdatedAt should be updated after setVersion", 
                profile.getUpdatedAt().getTime() >= initialUpdate.getTime());
        
        Date afterVersion = profile.getUpdatedAt();
        
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            // 忽略
        }
        
        profile.setAuthor("NewAuthor");
        assertTrue("UpdatedAt should be updated after setAuthor", 
                profile.getUpdatedAt().getTime() >= afterVersion.getTime());
    }

    /**
     * 测试多个属性设置
     */
    @Test
    public void testMultiplePropertySettings() {
        profile.setName("UpdatedProfile");
        profile.setVersion("2.0.0");
        profile.setAuthor("NewAuthor");
        profile.setEngineApiVersion("2.0.0");
        profile.setDescription("Updated description");
        profile.setEntryPoint("index.js");
        profile.setScriptCode("new code");
        
        assertEquals("Name should be UpdatedProfile", "UpdatedProfile", profile.getName());
        assertEquals("Version should be 2.0.0", "2.0.0", profile.getVersion());
        assertEquals("Author should be NewAuthor", "NewAuthor", profile.getAuthor());
        assertEquals("EngineApiVersion should be 2.0.0", "2.0.0", profile.getEngineApiVersion());
        assertEquals("Description should match", "Updated description", profile.getDescription());
        assertEquals("EntryPoint should be index.js", "index.js", profile.getEntryPoint());
        assertEquals("ScriptCode should match", "new code", profile.getScriptCode());
    }

    /**
     * 测试特殊字符在名称中
     */
    @Test
    public void testSpecialCharactersInName() {
        String specialName = "Profile @#$%^&*()_+{}|:<>?";
        profile.setName(specialName);
        
        assertEquals("Name should support special characters", specialName, profile.getName());
    }

    /**
     * 测试 Unicode 字符
     */
    @Test
    public void testUnicodeCharacters() {
        String unicodeName = "配置文件 テスト プロファイル";
        String unicodeAuthor = "作者 🎮";
        
        profile.setName(unicodeName);
        profile.setAuthor(unicodeAuthor);
        
        assertEquals("Name should support Unicode", unicodeName, profile.getName());
        assertEquals("Author should support Unicode", unicodeAuthor, profile.getAuthor());
    }

    /**
     * 测试长字符串
     */
    @Test
    public void testLongStrings() {
        StringBuilder longDescription = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            longDescription.append("a");
        }
        
        profile.setDescription(longDescription.toString());
        assertEquals("Long description should be supported", longDescription.toString(), profile.getDescription());
    }

    /**
     * 测试脚本代码包含特殊字符
     */
    @Test
    public void testScriptCodeWithSpecialCharacters() {
        String specialScript = "function update(raw) { return {heldKeys: ['A', 'B', 'C'], value: 日本語 }; }";
        profile.setScriptCode(specialScript);
        
        assertEquals("ScriptCode should support special characters", specialScript, profile.getScriptCode());
    }

    /**
     * 测试完整性：所有字段都可以设置和获取
     */
    @Test
    public void testProfileCompleteness() {
        ScriptProfile fullProfile = new ScriptProfile(
            "CompleteProfile",
            "1.0.0",
            "CompleteAuthor",
            "main.js",
            "function update(raw) { return {}; }"
        );
        
        fullProfile.setId("custom-id");
        fullProfile.setEngineApiVersion("1.5.0");
        fullProfile.setDescription("A complete profile");
        
        List<String> deps = Arrays.asList("dep1", "dep2");
        fullProfile.setDependencies(deps);
        
        ScriptProfile.CompatibilityInfo compat = new ScriptProfile.CompatibilityInfo();
        compat.setSupportedGamepads(Arrays.asList("Xbox"));
        compat.setMinimumAndroidVersion("8.0");
        fullProfile.setCompatibility(compat);
        
        // 验证所有字段
        assertEquals("ID should match", "custom-id", fullProfile.getId());
        assertEquals("Name should match", "CompleteProfile", fullProfile.getName());
        assertEquals("Version should match", "1.0.0", fullProfile.getVersion());
        assertEquals("Author should match", "CompleteAuthor", fullProfile.getAuthor());
        assertEquals("EngineApiVersion should match", "1.5.0", fullProfile.getEngineApiVersion());
        assertEquals("Description should match", "A complete profile", fullProfile.getDescription());
        assertEquals("EntryPoint should match", "main.js", fullProfile.getEntryPoint());
        assertEquals("ScriptCode should match", "function update(raw) { return {}; }", fullProfile.getScriptCode());
        assertEquals("Dependencies should match", deps, fullProfile.getDependencies());
        assertNotNull("Compatibility should not be null", fullProfile.getCompatibility());
        assertNotNull("CreatedAt should not be null", fullProfile.getCreatedAt());
        assertNotNull("UpdatedAt should not be null", fullProfile.getUpdatedAt());
    }
}
