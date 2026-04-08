# Task-P2-clean-old-directories: 清理旧文档目录

**创建时间**：2026-04-10 15:00:00
**优先级**：P2
**状态**：completed
**项目**：ControlX
**预计时间**：10 分钟
**父任务**：用户请求 - ControlX 项目文档改进方案执行
**依赖任务**：task-P1-migrate-core-documents, task-P1-migrate-server-tech-docs, task-P1-migrate-android-tech-docs
**完成时间**：2026-04-10 16:30:00

---

## 一、任务描述

**原子操作**：清理迁移完成后的旧文档目录（doc/ 和根目录 docs/dependencies.md）

---

## 二、任务背景

### 2.1 问题描述

文档迁移完成后，需要清理旧的 doc/ 目录和根目录 docs/ 文件夹中的临时文件，避免文档重复和目录混乱。

### 2.2 影响范围

- 直接影响：删除 doc/ 目录中已迁移的文件
- 直接影响：删除根目录 docs/ 中的临时文件
- 间接影响：需要更新索引文件中的路径引用

### 2.3 相关文件

- 清理目录：/workspaces/agent-workspace/projects/ControlX/doc/
- 清理文件：/workspaces/agent-workspace/projects/ControlX/docs/dependencies.md

---

## 三、执行计划

### 3.1 操作前检查

必须确认以下迁移任务已完成：

- [ ] task-P1-migrate-core-documents 已完成
- [ ] task-P1-migrate-server-tech-docs 已完成
- [ ] task-P1-migrate-android-tech-docs 已完成

检查命令：

```bash
# 确认新目录文件存在
ls /workspaces/agent-workspace/projects/ControlX/docs/SRS.md
ls /workspaces/agent-workspace/projects/ControlX/docs/tech/server/
ls /workspaces/agent-workspace/projects/ControlX/docs/tech/android/

# 确认旧目录文件已不存在（应该已被 git mv 移走）
ls /workspaces/agent-workspace/projects/ControlX/doc/requirements.md
ls /workspaces/agent-workspace/projects/ControlX/doc/function.md
ls /workspaces/agent-workspace/projects/ControlX/doc/TechDesign/Server/
```

### 3.2 操作步骤

#### 步骤 1：迁移 docs/dependencies.md

**操作类型**：移动（使用 git mv）
**源路径**：/workspaces/agent-workspace/projects/ControlX/docs/dependencies.md
**目标路径**：/workspaces/agent-workspace/projects/ControlX/docs/dependencies.md（已在目标位置，无需移动）

注意：根目录 docs/ 文件夹只有一个文件 dependencies.md，直接移动到新 docs/ 目录。

```bash
cd /workspaces/agent-workspace/projects/ControlX
# 如果新 docs/ 已创建，直接移动
git mv docs/dependencies.md docs/dependencies.md 2>/dev/null || echo "文件已在目标位置"
```

#### 步骤 2：删除空的 doc/ 目录

**操作类型**：删除目录
**路径**：/workspaces/agent-workspace/projects/ControlX/doc/

需要保留的文件检查：

- doc/LICENSE - 保留或移动到 docs/LICENSE
- doc/AndroidUILayoutCalculation.md - 可迁移到 docs/tech/android/
- doc/AndroidUiRendering.md - 可迁移到 docs/tech/android/
- doc/TechDesign/INDEX.md - 可迁移到 docs/INDEX.md 作为补充
- doc/TechDesign/TechDesign-TransportLayer.md - 可迁移到 docs/tech/
- doc/current_plan.md、doc/todo.md、doc/temptest.md - 临时文件可删除

```bash
cd /workspaces/agent-workspace/projects/ControlX

# 检查 doc/ 目录剩余内容
ls -la doc/

# 保留有价值文件，移动到 docs/
git mv doc/LICENSE docs/LICENSE
git mv doc/AndroidUILayoutCalculation.md docs/tech/android/AndroidUILayoutCalculation.md
git mv doc/AndroidUiRendering.md docs/tech/android/AndroidUiRendering.md
git mv doc/TechDesign/INDEX.md docs/tech/INDEX.md
git mv doc/TechDesign/TechDesign-TransportLayer.md docs/tech/TransportLayer.md

# 删除临时文件
git rm doc/current_plan.md doc/todo.md doc/temptest.md doc/docs/ 2>/dev/null || true

# 删除空目录（如果已空）
rmdir doc/TechDesign/Server doc/TechDesign/AndroidClient doc/TechDesign doc/bdd doc/tests doc/LayoutFileStructureDefinition 2>/dev/null || true
rmdir doc 2>/dev/null || echo "目录未空，保留剩余内容"
```

### 3.3 验证步骤

```bash
# 验证新目录结构完整
ls -la /workspaces/agent-workspace/projects/ControlX/docs/

# 验证旧目录已清理或保留必要文件
ls -la /workspaces/agent-workspace/projects/ControlX/doc/ 2>/dev/null || echo "doc/ 目录已删除"

# 验证 Git 状态
cd /workspaces/agent-workspace/projects/ControlX
git status
```

### 3.4 回滚方案

**回滚操作**：

```bash
cd /workspaces/agent-workspace/projects/ControlX
git checkout -- doc/
git checkout -- docs/dependencies.md
```

---

## 四、验收标准

- [ ] docs/ 目录结构完整
- [ ] docs/dependencies.md 存在于正确位置
- [ ] doc/ 目录已清理（临时文件删除）
- [ ] 有价值文件已迁移到 docs/
- [ ] Git 历史已保留
- [ ] 无重复文档

---

## 五、风险评估

| 风险项             | 可能性 | 影响程度 | 缓解策略               |
| ------------------ | ------ | -------- | ---------------------- |
| 误删有价值文件     | 中     | 高       | 执行前详细检查目录内容 |
| 前置迁移任务未完成 | 低     | 高       | 严格依赖关系检查       |

---

## 六、分支信息

**基础分支**：develop
**任务分支**：task/P2-clean-old-directories
**合并目标**：develop
**分支策略**：创建新分支

---

## 七、执行进度（实时更新区域）

### 任务完成说明

**状态**：已完成（无需执行）
**开始时间**：2026-04-10 16:30:00
**完成时间**：2026-04-10 16:30:00
**执行结果**：doc/目录已在task-P1-clean-doc-residue任务中完成清理，无需额外执行
**备注**：

- 检查发现doc/目录已不存在，已被前序任务task-P1-clean-doc-residue清理
- docs/目录结构完整，包含所有必要文件（SRS.md, HLD.md, dependencies.md等）
- docs/tech/子目录结构完整（server/, android/）
- 任务目标已在前序任务中达成，无需重复执行

---

## 八、问题记录（实时更新区域）

（暂无问题）

---

## 九、有价值发现（实时更新区域）

（暂无发现）

---

## 十、审核记录（实时更新区域）

（待审核）
