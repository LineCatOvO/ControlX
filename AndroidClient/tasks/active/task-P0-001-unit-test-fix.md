# Task-P0-001: 单元测试修复方案

**创建时间**：2026-03-17
**优先级**：P0
**状态**：待处理
**任务锁**：🔓 待处理 - Planner - 2026-03-17
**项目**：ControlX/AndroidClient

## 任务描述
修复 SafetyControllerTest 和 InputStateControllerTest 单元测试失败问题，使所有测试通过。

## 任务背景

### 问题分析

**测试失败统计**：
- 总测试：235
- 通过：189
- 失败：46
- 失败测试类：SafetyControllerTest (24个), InputStateControllerTest (22个)

**失败根本原因**：
1. `SafetyController` 类使用了 `android.util.Log` API
2. `InputStateController` 类使用了 `android.util.Log` API
3. 本地 JVM 单元测试无法访问 Android API
4. 当前项目没有配置 Robolectric

**相关文件**：
- `/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx/core/safety/SafetyController.java` - 使用 `android.util.Log`
- `/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/main/java/com/linecat/controlx/input/InputStateController.java` - 使用 `android.util.Log`
- `/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java` - 测试类
- `/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java` - 测试类

### 当前测试配置

**build.gradle 依赖**：
```groovy
testImplementation libs.junit                    // JUnit 4.13.2
testImplementation 'org.assertj:assertj-core:3.25.3'
testImplementation 'org.mockito:mockito-core:5.11.0'
```

**libs.versions.toml**：
```toml
[versions]
junit = "4.13.2"
mockito-core = "5.11.0"  # 已有
```

## 修复方案选择

### 方案对比

| 方案 | 优点 | 缺点 | ARM64兼容性 |
|------|------|------|-------------|
| **方案A: Mockito mockStatic** | 改动最小、运行快、已有依赖 | 需要 Mockito 5.x | ✅ 完全兼容 |
| 方案B: Robolectric | 完整 Android 环境 | 依赖重、启动慢、配置复杂 | ⚠️ 可能有兼容问题 |
| 方案C: 提取 Log 接口 | 架构更清晰 | 改动大、影响生产代码 | ✅ 完全兼容 |

### 推荐方案：方案A - Mockito mockStatic

**选择理由**：
1. 项目已使用 Mockito 5.11.0，支持 `mockStatic`
2. 改动最小，仅修改测试类
3. ARM64 环境完全兼容
4. 测试运行速度快
5. 不影响生产代码

## 详细执行计划

### 任务1：添加 Mockito Inline 依赖

**任务ID**：task-P0-001-1
**操作类型**：文件编辑
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/build.gradle`
**预计执行时间**：约30秒

#### 任务背景
Mockito 5.x 的 `mockStatic` 功能需要 `mockito-inline` 依赖，当前只有 `mockito-core`。

#### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/build.gradle
搜索内容（old_str）：
    testImplementation 'org.mockito:mockito-core:5.11.0'
替换内容（new_str）：
    testImplementation 'org.mockito:mockito-core:5.11.0'
    testImplementation 'org.mockito:mockito-inline:5.11.0'
```

#### 验证命令（必填）
```
验证命令：grep -n "mockito-inline" /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/build.gradle
预期输出：    testImplementation 'org.mockito:mockito-inline:5.11.0'
```

#### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
删除添加的 mockito-inline 行
```

#### 依赖关系
- 前置任务：无
- 后置任务：task-P0-001-2

---

### 任务2：创建 AndroidLogMocker 测试工具类

**任务ID**：task-P0-001-2
**操作类型**：文件创建
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/controlx/testutil/AndroidLogMocker.java`
**预计执行时间**：约60秒

#### 任务背景
创建一个可复用的工具类，用于在测试中 mock `android.util.Log`，避免每个测试类重复编写 mock 代码。

#### 操作命令（必填）
```
操作：使用 Write 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/controlx/testutil/AndroidLogMocker.java
文件内容：
package com.linecat.controlx.testutil;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

import android.util.Log;

/**
 * Android Log Mock 工具类
 * 用于在单元测试中 mock android.util.Log
 */
public class AndroidLogMocker {

    private static MockedStatic<Log> logMock;

    /**
     * 启动 Log mock
     * 在测试类的 @Before 方法中调用
     */
    public static void setup() {
        if (logMock == null) {
            logMock = Mockito.mockStatic(Log.class);
            
            // Mock 所有 Log 方法，返回默认值
            logMock.when(() -> Log.d(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            logMock.when(() -> Log.i(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            logMock.when(() -> Log.w(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            logMock.when(() -> Log.e(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            logMock.when(() -> Log.v(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            logMock.when(() -> Log.wtf(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            
            // Mock 带 Throwable 的方法
            logMock.when(() -> Log.w(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            logMock.when(() -> Log.e(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            logMock.when(() -> Log.wtf(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
        }
    }

    /**
     * 关闭 Log mock
     * 在测试类的 @After 方法中调用
     */
    public static void teardown() {
        if (logMock != null) {
            logMock.close();
            logMock = null;
        }
    }

    /**
     * 获取 Log mock 实例
     * 用于自定义 mock 行为
     */
    public static MockedStatic<Log> getLogMock() {
        return logMock;
    }

    /**
     * 验证 Log.d 是否被调用
     */
    public static void verifyDebugLog(String tag, String message) {
        logMock.verify(() -> Log.d(tag, message));
    }

    /**
     * 验证 Log.e 是否被调用
     */
    public static void verifyErrorLog(String tag, String message) {
        logMock.verify(() -> Log.e(tag, message));
    }
}
```

#### 验证命令（必填）
```
验证命令：test -f /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/controlx/testutil/AndroidLogMocker.java && echo "File exists"
预期输出：File exists
```

#### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
rm /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/controlx/testutil/AndroidLogMocker.java
```

#### 依赖关系
- 前置任务：task-P0-001-1
- 后置任务：task-P0-001-3

---

### 任务3：修改 SafetyControllerTest 测试类

**任务ID**：task-P0-001-3
**操作类型**：文件编辑
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java`
**预计执行时间**：约60秒

#### 任务背景
在 SafetyControllerTest 中添加 Log mock 初始化和清理代码。

#### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java
搜索内容（old_str）：
package com.linecat.controlx.core.safety;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import static org.junit.Assert.*;
替换内容（new_str）：
package com.linecat.controlx.core.safety;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import com.linecat.controlx.testutil.AndroidLogMocker;

import static org.junit.Assert.*;
```

#### 操作内容（详细步骤）
1. 添加 `AndroidLogMocker` 导入语句
2. 在 `@Before setUp()` 方法开头添加 `AndroidLogMocker.setup();`
3. 在 `@After tearDown()` 方法开头添加 `AndroidLogMocker.teardown();`

#### 验证命令（必填）
```
验证命令：grep -n "AndroidLogMocker" /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java
预期输出：import com.linecat.controlx.testutil.AndroidLogMocker;
```

#### 回滚方案（必填）
```
如果操作失败，执行以下回滚：
使用 git checkout 恢复文件
```

#### 依赖关系
- 前置任务：task-P0-001-2
- 后置任务：task-P0-001-4

---

### 任务4：修改 SafetyControllerTest 的 setUp 和 tearDown 方法

**任务ID**：task-P0-001-4
**操作类型**：文件编辑
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java`
**预计执行时间**：约30秒

#### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java
搜索内容（old_str）：
    @Before
    public void setUp() {
        safetyController = new SafetyController();
    }

    @After
    public void tearDown() {
        safetyController.disable();
    }
替换内容（new_str）：
    @Before
    public void setUp() {
        AndroidLogMocker.setup();
        safetyController = new SafetyController();
    }

    @After
    public void tearDown() {
        safetyController.disable();
        AndroidLogMocker.teardown();
    }
```

#### 验证命令（必填）
```
验证命令：grep -A2 "@Before" /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/core/safety/SafetyControllerTest.java | grep "AndroidLogMocker.setup"
预期输出：        AndroidLogMocker.setup();
```

#### 依赖关系
- 前置任务：task-P0-001-3
- 后置任务：task-P0-001-5

---

### 任务5：修改 InputStateControllerTest 测试类

**任务ID**：task-P0-001-5
**操作类型**：文件编辑
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java`
**预计执行时间**：约60秒

#### 任务背景
在 InputStateControllerTest 中添加 Log mock 初始化和清理代码。

#### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java
搜索内容（old_str）：
package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import com.linecat.controlx.model.InputState;

import static org.junit.Assert.*;
替换内容（new_str）：
package com.linecat.controlx.input;

import org.junit.Test;
import org.junit.Before;
import org.junit.After;

import com.linecat.controlx.model.InputState;
import com.linecat.controlx.testutil.AndroidLogMocker;

import static org.junit.Assert.*;
```

#### 验证命令（必填）
```
验证命令：grep -n "AndroidLogMocker" /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java
预期输出：import com.linecat.controlx.testutil.AndroidLogMocker;
```

#### 依赖关系
- 前置任务：task-P0-001-4
- 后置任务：task-P0-001-6

---

### 任务6：修改 InputStateControllerTest 的 setUp 和 tearDown 方法

**任务ID**：task-P0-001-6
**操作类型**：文件编辑
**目标文件**：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java`
**预计执行时间**：约30秒

#### 操作命令（必填）
```
操作：使用 SearchReplace 工具
文件路径：/home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java
搜索内容（old_str）：
    @Before
    public void setUp() {
        controller = new InputStateController();
    }

    @After
    public void tearDown() {
        controller.destroy();
    }
替换内容（new_str）：
    @Before
    public void setUp() {
        AndroidLogMocker.setup();
        controller = new InputStateController();
    }

    @After
    public void tearDown() {
        controller.destroy();
        AndroidLogMocker.teardown();
    }
```

#### 验证命令（必填）
```
验证命令：grep -A2 "@Before" /home/linecat/agent-workspace/projects/ControlX/AndroidClient/app/src/test/java/com/linecat/wmmtcontroller/input/InputStateControllerTest.java | grep "AndroidLogMocker.setup"
预期输出：        AndroidLogMocker.setup();
```

#### 依赖关系
- 前置任务：task-P0-001-5
- 后置任务：task-P0-001-7

---

### 任务7：运行测试验证修复结果

**任务ID**：task-P0-001-7
**操作类型**：命令执行
**目标文件**：不适用
**预计执行时间**：约120秒

#### 任务背景
运行单元测试验证所有修复是否生效。

#### 操作命令（必填）
```
操作：使用 RunCommand 工具
命令：./gradlew testDebugUnitTest --tests "com.linecat.controlx.core.safety.SafetyControllerTest" --tests "com.linecat.controlx.input.InputStateControllerTest"
工作目录：/home/linecat/agent-workspace/projects/ControlX/AndroidClient
```

#### 验证命令（必填）
```
验证命令：./gradlew testDebugUnitTest 2>&1 | grep -E "(tests|passed|failed)"
预期输出：包含 "passed" 且无 "failed"
```

#### 依赖关系
- 前置任务：task-P0-001-6
- 后置任务：无

---

## 验收标准

- [ ] mockito-inline 依赖已添加到 build.gradle
- [ ] AndroidLogMocker 工具类已创建
- [ ] SafetyControllerTest 已修改，包含 Log mock
- [ ] InputStateControllerTest 已修改，包含 Log mock
- [ ] 所有单元测试通过（235/235）
- [ ] 测试运行无异常

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Mockito inline 在 ARM64 上不兼容 | 高 | Mockito 5.x 已支持 ARM64，风险低 |
| 测试类包名不一致 | 中 | 确认测试类包名与工具类包名正确导入 |
| Gradle 同步失败 | 低 | 检查网络连接，使用国内镜像 |
| 测试并发问题 | 低 | AndroidLogMocker 使用静态变量，确保 teardown 正确调用 |

## 相关资源

- Mockito mockStatic 文档：https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/MockedStatic.html
- 项目测试报告：`/home/linecat/agent-workspace/projects/ControlX/AndroidClient/TEST_RUN_REPORT.md`

## 标签
unit-test, mockito, android, fix, P0

---

## 任务列表

**总任务数**：7
**预计执行时间**：约6分钟

### 任务依赖图
```
task-P0-001-1 → task-P0-001-2 → task-P0-001-3 → task-P0-001-4 → task-P0-001-5 → task-P0-001-6 → task-P0-001-7
```

### 任务列表
| 序号 | 任务ID | 任务名称 | 操作类型 | 依赖 | 预计时间 |
|------|--------|----------|----------|------|----------|
| 1 | task-P0-001-1 | 添加 Mockito Inline 依赖 | 文件编辑 | 无 | 30秒 |
| 2 | task-P0-001-2 | 创建 AndroidLogMocker 工具类 | 文件创建 | task-P0-001-1 | 60秒 |
| 3 | task-P0-001-3 | 修改 SafetyControllerTest 导入 | 文件编辑 | task-P0-001-2 | 60秒 |
| 4 | task-P0-001-4 | 修改 SafetyControllerTest 方法 | 文件编辑 | task-P0-001-3 | 30秒 |
| 5 | task-P0-001-5 | 修改 InputStateControllerTest 导入 | 文件编辑 | task-P0-001-4 | 60秒 |
| 6 | task-P0-001-6 | 修改 InputStateControllerTest 方法 | 文件编辑 | task-P0-001-5 | 30秒 |
| 7 | task-P0-001-7 | 运行测试验证 | 命令执行 | task-P0-001-6 | 120秒 |