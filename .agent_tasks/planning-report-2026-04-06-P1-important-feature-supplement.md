# P1 重要功能补充任务规划报告

**规划时间**：2026-04-06 01:30:00 - 02:00:00
**规划者**：Planner 子代理
**任务范围**：单子项目：controlx
**任务路径**：/workspaces/agent-workspace/projects/controlx/

---

## 一、任务识别与分析

### 1.1 原始任务
执行 P1 重要功能补充任务，按优先级顺序：
- P1-1: 平台代码测试覆盖率提升（hosts/router/shadow 模块）
- P1-2: 模块边界重构验证与补充
- P1-3: InputRouter 性能优化

### 1.2 任务分析结果

| 任务项 | 分析结果 | 复杂度 | 预计时间 |
|--------|----------|--------|----------|
| P1-1 | 需创建多个测试文件，补充现有测试 | 高 | 3-4 小时 |
| P1-2 | 验证清零权限，检查其他模块，创建文档 | 中 | 1-2 小时 |
| P1-3 | 性能分析、优化、测试 | 中 | 1-2 小时 |

---

## 二、深度搜索结果

### 2.1 核心模块文件列表

**hosts 模块**（9个文件）：
```
src/input/hosts/InputHost.ts          - 抽象基类（120行）
src/input/hosts/WindowsKeyboardHost.ts - Windows 键盘实现（140行）
src/input/hosts/WindowsGamepadHost.ts  - Windows 游戏手柄实现
src/input/hosts/LinuxKeyboardHost.ts   - Linux 键盘空类
src/input/hosts/LinuxGamepadHost.ts    - Linux 游戏手柄空类
src/input/hosts/MacOSKeyboardHost.ts   - MacOS 键盘空类
src/input/hosts/MacOSGamepadHost.ts    - MacOS 游戏手柄空类
src/input/hosts/index.ts               - 导出索引
src/input/hosts/types.ts               - 类型定义
```

**router 模块**（2个文件）：
```
src/input/router/InputRouter.ts - 输入路由器（180行）
src/input/router/index.ts       - 导出索引
```

**shadow 模块**（3个文件）：
```
src/input/shadow/ShadowModeManager.ts - 影子模式管理器（500行）
src/input/shadow/index.ts             - 导出索引
src/input/executor_shadow.ts          - 影子执行器
```

### 2.2 现有测试文件列表

```
tests/cases/inputRouter.test.ts          - 28个测试（router模块）
tests/cases/shadowModeManager.test.ts    - 22个测试（shadow模块）
tests/cases/safetyController.test.ts     - SafetyController测试
tests/cases/hosts/                       - 目录不存在（需创建）
```

### 2.3 当前覆盖率情况

| 模块 | 当前覆盖率 | 目标覆盖率 | 差距 | 原因分析 |
|------|------------|------------|------|----------|
| **hosts** | 9.03% | > 60% | 51% | 缺少测试文件 |
| **router** | 3.17% | > 70% | 67% | 需补充边界测试 |
| **shadow** | 1.02% | > 60% | 59% | 需补充配置测试 |

---

## 三、原子化任务分解

### 3.1 P1-1 任务分解（测试覆盖率提升）

| 任务文档 | 任务内容 | 优先级 | 预计时间 | 创建状态 |
|----------|----------|--------|----------|----------|
| task-P1-1-1-input-host-test | 创建 InputHost.test.ts（22个测试） | P1 | 30分钟 | ✅ 已创建 |
| task-P1-1-2-windows-keyboard-host-test | 创建 WindowsKeyboardHost.test.ts（30个测试） | P1 | 40分钟 | ⏳ 待创建 |
| task-P1-1-3-windows-gamepad-host-test | 创建 WindowsGamepadHost.test.ts（20个测试） | P1 | 30分钟 | ⏳ 待创建 |
| task-P1-1-4-hosts-types-test | 创建 types.test.ts（15个测试） | P1 | 20分钟 | ⏳ 待创建 |
| task-P1-1-5-input-router-test-supplement | 补充 inputRouter.test.ts（20个测试） | P1 | 30分钟 | ⏳ 待创建 |
| task-P1-1-6-shadow-mode-test-supplement | 补充 shadowModeManager.test.ts（20个测试） | P1 | 30分钟 | ⏳ 待创建 |

**P1-1 总计**：6个原子任务，预计 3小时

### 3.2 P1-2 任务分解（模块边界验证）

| 任务文档 | 任务内容 | 优先级 | 预计时间 | 创建状态 |
|----------|----------|--------|----------|----------|
| task-P1-2-1-verify-clear-permission | 验证 SafetyController 清零权限 | P1 | 20分钟 | ⏳ 待创建 |
| task-P1-2-2-verify-other-module-clear | 验证其他模块清零逻辑 | P1 | 30分钟 | ⏳ 待创建 |
| task-P1-2-3-module-boundary-doc | 创建模块边界文档 | P1 | 40分钟 | ⏳ 待创建 |

**P1-2 总计**：3个原子任务，预计 1.5小时

### 3.3 P1-3 任务分解（InputRouter 性能优化）

| 任务文档 | 任务内容 | 优先级 | 预计时间 | 创建状态 |
|----------|----------|--------|----------|----------|
| task-P1-3-1-analyze-router-performance | 分析 InputRouter 性能瓶颈 | P1 | 30分钟 | ⏳ 待创建 |
| task-P1-3-2-optimize-router-dispatch | 优化 InputRouter 分发逻辑 | P1 | 40分钟 | ⏳ 待创建 |
| task-P1-3-3-router-performance-test | 创建 InputRouter 性能测试 | P1 | 30分钟 | ⏳ 待创建 |

**P1-3 总计**：3个原子任务，预计 1.5小时

---

## 四、执行顺序建议

### 4.1 任务依赖关系

```
P1-1-1 (InputHost测试) ──┐
P1-1-2 (KeyboardHost测试) ──┼──→ hosts模块覆盖率达标
P1-1-3 (GamepadHost测试) ──┼
P1-1-4 (types测试) ────────┘

P1-1-5 (Router测试补充) ───→ router模块覆盖率达标
P1-1-6 (Shadow测试补充) ───→ shadow模块覆盖率达标

P1-2-1 (清零权限验证) ──┐
P1-2-2 (其他模块验证) ──┼──→ 模块边界验证完成
P1-2-3 (边界文档) ──────┘

P1-3-1 (性能分析) ──┐
P1-3-2 (优化实现) ──┼──→ 性能优化完成
P1-3-3 (性能测试) ──┘
```

### 4.2 建议执行顺序

**阶段一**：测试覆盖率提升（P1-1）
1. task-P1-1-1-input-host-test（基础）
2. task-P1-1-2-windows-keyboard-host-test
3. task-P1-1-3-windows-gamepad-host-test
4. task-P1-1-4-hosts-types-test
5. task-P1-1-5-input-router-test-supplement
6. task-P1-1-6-shadow-mode-test-supplement

**阶段二**：模块边界验证（P1-2）
7. task-P1-2-1-verify-clear-permission
8. task-P1-2-2-verify-other-module-clear
9. task-P1-2-3-module-boundary-doc

**阶段三**：性能优化（P1-3）
10. task-P1-3-1-analyze-router-performance
11. task-P1-3-2-optimize-router-dispatch
12. task-P1-3-3-router-performance-test

---

## 五、分支规划

**任务类型**：功能开发任务
**基础分支**：master（当前开发分支）
**任务分支**：task-P1-important-feature-supplement
**合并目标**：master
**分支策略**：创建新分支

**创建分支命令**：
```bash
git checkout master
git pull origin master
git checkout -b task-P1-important-feature-supplement
git push origin task-P1-important-feature-supplement
```

---

## 六、有价值发现

### 发现一：SafetyController 设计完善
**内容**：SafetyController 已实现完善的清零权限控制机制：
- 权限令牌机制（ClearPermissionToken）
- 清零权限类型（internal, external, emergency）
- 清零历史记录（ClearRecord）
- 时间权威性（使用 ApplyScheduler 的 tickTime）

**价值**：表明 P1-2 模块边界重构已基本完成，只需验证其他模块是否有清零逻辑。

### 发现二：InputRouter 已有完善测试
**内容**：tests/cases/inputRouter.test.ts 已有 28 个测试用例，覆盖主要功能。

**价值**：router 模块测试基础较好，可快速补充覆盖率。

### 发现三：ShadowModeManager 测试完善
**内容**：tests/cases/shadowModeManager.test.ts 已有 22 个测试用例，覆盖主要功能。

**价值**：shadow 模块测试基础较好，可快速补充覆盖率。

### 发现四：hosts 模块缺少测试目录
**内容**：tests/cases/hosts/ 目录不存在，需要创建。

**建议**：创建目录并添加测试文件。

---

## 七、验收标准总结

### P1-1 验收标准
- [ ] hosts 模块覆盖率 > 60%
- [ ] router 模块覆盖率 > 70%
- [ ] shadow 模块覆盖率 > 60%

### P1-2 验收标准
- [ ] SafetyController 为唯一清零入口
- [ ] 其他模块无清零逻辑
- [ ] 模块边界文档完整

### P1-3 验收标准
- [ ] 性能瓶颈分析完成
- [ ] 优化方案实施完成
- [ ] 性能测试通过

---

## 八、任务文档创建状态

| 总任务文档 | 状态 | 路径 |
|------------|------|------|
| task-P1-important-feature-supplement | ✅ 已创建 | active/task-P1-important-feature-supplement.md |

| 原子任务文档 | 状态 | 路径 |
|--------------|------|------|
| task-P1-1-1-input-host-test | ✅ 已创建 | pending/task-P1-1-1-input-host-test.md |
| task-P1-1-2-windows-keyboard-host-test | ⏳ 待创建 | pending/task-P1-1-2-windows-keyboard-host-test.md |
| task-P1-1-3-windows-gamepad-host-test | ⏳ 待创建 | pending/task-P1-1-3-windows-gamepad-host-test.md |
| task-P1-1-4-hosts-types-test | ⏳ 待创建 | pending/task-P1-1-4-hosts-types-test.md |
| task-P1-1-5-input-router-test-supplement | ⏳ 待创建 | pending/task-P1-1-5-input-router-test-supplement.md |
| task-P1-1-6-shadow-mode-test-supplement | ⏳ 待创建 | pending/task-P1-1-6-shadow-mode-test-supplement.md |
| task-P1-2-1-verify-clear-permission | ⏳ 待创建 | pending/task-P1-2-1-verify-clear-permission.md |
| task-P1-2-2-verify-other-module-clear | ⏳ 待创建 | pending/task-P1-2-2-verify-other-module-clear.md |
| task-P1-2-3-module-boundary-doc | ⏳ 待创建 | pending/task-P1-2-3-module-boundary-doc.md |
| task-P1-3-1-analyze-router-performance | ⏳ 待创建 | pending/task-P1-3-1-analyze-router-performance.md |
| task-P1-3-2-optimize-router-dispatch | ⏳ 待创建 | pending/task-P1-3-2-optimize-router-dispatch.md |
| task-P1-3-3-router-performance-test | ⏳ 待创建 | pending/task-P1-3-3-router-performance-test.md |

---

## 九、下一步行动建议

1. **Manager 应创建任务分支**：`task-P1-important-feature-supplement`
2. **Manager 应调度 Coder**：按顺序执行原子任务
3. **建议并行执行**：
   - P1-1-1 到 P1-1-4 可并行执行（hosts 模块测试）
   - P1-1-5 和 P1-1-6 可并行执行（router/shadow 测试补充）
4. **建议顺序执行**：
   - P1-2 任务需等待 P1-1 完成
   - P1-3 任务需等待 P1-2 完成

---

## 十、规划报告提交

**提交命令**：
```bash
git add .agent_tasks/active/task-P1-important-feature-supplement.md
git add .agent_tasks/pending/task-P1-1-1-input-host-test.md
git add .agent_tasks/planning-report-2026-04-06-P1-important-feature-supplement.md
git commit -m "docs: 创建 P1 重要功能补充任务规划报告"
git push
```

---

**规划完成时间**：2026-04-06 02:00:00
**规划者**：Planner 子代理
**版本**：v1.0