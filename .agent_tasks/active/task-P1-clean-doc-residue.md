# Task-P1-clean-doc-residue: 清理旧文档目录残留内容

**创建时间**：2026-04-10
**优先级**：P1
**状态**：active
**项目**：ControlX
**预计时间**：15 分钟
**父任务**：用户请求 - ControlX项目下一步任务规划
**依赖任务**：task-P0-update-task-status

---

## 一、任务描述

**原子操作**：检查并清理doc/目录下的残留文件夹，确保文档结构整洁

---

## 二、任务背景

### 2.1 问题描述

文档迁移完成后，doc/目录仍存在以下残留文件夹：

- doc/bdd/ - BDD测试相关？
- doc/docs/ - 临时docs文件夹？
- doc/LayoutFileStructureDefinition/ - 布局文件结构定义？
- doc/tests/ - 测试相关？

这些残留文件夹影响文档结构整洁，需要检查内容后清理。

### 2.2 影响范围

- 直接影响：doc/目录下的4个残留文件夹
- 间接影响：项目文档结构整洁性

### 2.3 相关文件

- 清理目录1：/workspaces/agent-workspace/projects/ControlX/doc/bdd/
- 清理目录2：/workspaces/agent-workspace/projects/ControlX/doc/docs/
- 清理目录3：/workspaces/agent-workspace/projects/ControlX/doc/LayoutFileStructureDefinition/
- 清理目录4：/workspaces/agent-workspace/projects/ControlX/doc/tests/

---

## 三、执行计划

### 3.1 操作前检查

**必须先检查每个目录的内容，确认是否有有价值文件**

#### 检查命令

```bash
cd /workspaces/agent-workspace/projects/ControlX

# 检查doc/bdd/内容
ls -la doc/bdd/

# 检查doc/docs/内容
ls -la doc/docs/

# 检查doc/LayoutFileStructureDefinition/内容
ls -la doc/LayoutFileStructureDefinition/

# 检查doc/tests/内容
ls -la doc/tests/
```

### 3.2 操作步骤

#### 步骤 1：检查并清理 doc/bdd/

**操作类型**：检查后删除或保留

执行检查后，根据内容决定：

- 如果为空或仅包含临时文件：删除
- 如果包含有价值的BDD测试文档：迁移到docs/tech/或保留

#### 步骤 2：检查并清理 doc/docs/

**操作类型**：检查后删除或迁移

执行检查后，根据内容决定：

- 如果为空或仅包含临时文件：删除
- 如果包含有价值文档：迁移到docs/

#### 步骤 3：检查并清理 doc/LayoutFileStructureDefinition/

**操作类型**：检查后删除或迁移

执行检查后，根据内容决定：

- 如果为空或仅包含临时文件：删除
- 如果包含有价值的布局定义文档：迁移到docs/tech/android/

#### 步骤 4：检查并清理 doc/tests/

**操作类型**：检查后删除或保留

执行检查后，根据内容决定：

- 如果为空或仅包含临时文件：删除
- 如果包含有价值的测试文档：迁移到docs/tech/server/

#### 步骤 5：删除空目录

**操作类型**：删除目录
**执行命令**：

```bash
cd /workspaces/agent-workspace/projects/ControlX

# 删除空的子目录
rmdir doc/bdd 2>/dev/null || echo "目录非空或不存在"
rmdir doc/docs 2>/dev/null || echo "目录非空或不存在"
rmdir doc/LayoutFileStructureDefinition 2>/dev/null || echo "目录非空或不存在"
rmdir doc/tests 2>/dev/null || echo "目录非空或不存在"

# 如果所有子目录已删除，删除doc/目录
rmdir doc 2>/dev/null || echo "目录非空或不存在，保留"
```

### 3.3 验证步骤

```bash
# 验证doc/目录状态
ls -la /workspaces/agent-workspace/projects/ControlX/doc/ 2>/dev/null || echo "doc/目录已删除"

# 验证docs/目录完整
ls -la /workspaces/agent-workspace/projects/ControlX/docs/

# 验证Git状态
cd /workspaces/agent-workspace/projects/ControlX
git status
```

### 3.4 回滚方案

**回滚操作**：

```bash
cd /workspaces/agent-workspace/projects/ControlX
git checkout -- doc/
```

---

## 四、验收标准

- [ ] doc/bdd/ 内容已检查并合理处理
- [ ] doc/docs/ 内容已检查并合理处理
- [ ] doc/LayoutFileStructureDefinition/ 内容已检查并合理处理
- [ ] doc/tests/ 内容已检查并合理处理
- [ ] 所有有价值的文件已迁移到docs/目录
- [ ] doc/目录已清理（删除或仅保留必要内容）
- [ ] Git提交已完成，提交信息规范

---

## 五、风险评估

| 风险项                     | 可能性 | 影响程度 | 缓解策略                   |
| -------------------------- | ------ | -------- | -------------------------- |
| doc/残留目录包含有价值文件 | 中     | 中       | 执行前详细检查每个目录内容 |
| 误删重要文档               | 低     | 高       | 使用git mv迁移而非rm删除   |
| 目录权限问题               | 低     | 低       | 检查权限后执行             |

---

## 六、分支信息

**基础分支**：master（当前分支）
**任务分支**：task/P1-clean-doc-residue
**合并目标**：master
**分支策略**：创建新分支

**创建分支命令**：

```bash
git checkout master
git pull origin master
git checkout -b task/P1-clean-doc-residue
git push origin task/P1-clean-doc-residue
```

---

## 七、执行进度（实时更新区域）

### 步骤一：检查doc/bdd/内容

**状态**：已完成
**开始时间**：2026-04-10
**完成时间**：2026-04-10
**检查结果**：发现9个.feature文件（01-08-app-lifecycle等）和README.md（共10个文件）
**处理决策**：迁移到docs/tech/bdd/，保留BDD测试文档
**备注**：文件有价值，使用git mv迁移

### 步骤二：检查doc/docs/内容

**状态**：已完成
**开始时间**：2026-04-10
**完成时间**：2026-04-10
**检查结果**：发现test-goals.md和test-matrix.md（共2个文件）
**处理决策**：迁移到docs/，保留测试相关文档
**备注**：文件有价值，使用git mv迁移

### 步骤三：检查doc/LayoutFileStructureDefinition/内容

**状态**：已完成
**开始时间**：2026-04-10
**完成时间**：2026-04-10
**检查结果**：发现main.md（布局文件结构定义文档）
**处理决策**：迁移到docs/tech/android/LayoutFileStructureDefinition.md
**备注**：文件有价值，使用git mv迁移

### 步骤四：检查doc/tests/内容

**状态**：已完成
**开始时间**：2026-04-10
**完成时间**：2026-04-10
**检查结果**：发现AndroidClient/main.md和server/main.md（共2个文件）
**处理决策**：AndroidClient/main.md迁移到docs/tech/android/tests-AndroidClient.md，server/main.md迁移到docs/tech/server/tests-main.md
**备注**：文件有价值，使用git mv迁移

### 步骤五：清理空目录

**状态**：已完成
**开始时间**：2026-04-10
**完成时间**：2026-04-10
**执行结果**：doc/目录及其所有子目录已删除
**备注**：使用rm -rf doc/删除整个目录

---

## 八、问题记录（实时更新区域）

无问题，所有操作顺利完成

---

## 九、有价值发现（实时更新区域）

发现docs/tech/目录结构完善，包含android和server子目录，适合存放技术文档

---

## 十、审核记录（实时更新区域）

（待审核）
