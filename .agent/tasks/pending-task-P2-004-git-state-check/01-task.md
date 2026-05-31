---
id: task-004
version: 1.0.0
taskType: analysis
projectContext: projects/ControlX
priority: P2
status: pending
created: 2026-06-01
sourceTemplate: routine-004-git-state-check.md
---

# Task: Git状态完整性检测

## 元信息

- taskId: 004
- status: pending
- priority: P2
- created: 2026-06-01
- sourceTemplate: routine-004-git-state-check.md

## 任务目标

检查ControlX项目工作目录Git状态，验证子模块状态，确保所有更改已正确提交或在可控状态。

## 任务类型

| 字段 | 内容 |
|------|------|
| 任务类型 | analysis |
| 项目上下文 | projects/ControlX |
| 操作范围 | /workspaces/agent-workspace/projects/ControlX/ |

## 背景说明

ControlX是git子模块结构的monorepo项目，需要验证主仓库和子模块的Git状态。

## 任务范围

### 涉及文件

| 文件路径 | 操作类型 | 说明 |
|----------|----------|------|
| .gitmodules | read | 子模块配置 |
| projects/*/ | read | 子模块仓库 |

### 命令列表

| 命令 | 类型 | 说明 |
|------|------|------|
| git --no-pager status | 基础命令 | 检查工作目录状态 |
| git --no-pager submodule status | 基础命令 | 检查子模块状态 |
| git --no-pager diff --stat | 基础命令 | 检查更改统计 |

### 边界约束

- **包含**：主仓库和所有子模块
- **排除**：外部仓库

## 输出明确

### 预期产出

| 产出物 | 位置 | 验证方法 |
|--------|------|----------|
| Git状态报告 | 任务文档自身分区 | 详细状态和分析 |

### 验证标准

- [ ] 工作目录clean或只有预期更改
- [ ] 无未追踪的重要文件
- [ ] 无未合并的冲突文件
- [ ] 所有子模块状态正常

## 五必备（自规划阶段强制要求）

### 执行步骤规划

| 步骤 | 描述 | 涉及文件 | 操作类型 | 验证方法 | 失败处理 |
|------|------|----------|----------|----------|----------|
| 1 | 工作目录状态检查 | .git | analyze | git status | 提交或撤销 |
| 2 | 未追踪文件处理 | 未追踪文件 | analyze | git status --porcelain | 添加或忽略 |
| 3 | 子模块状态检查 | .gitmodules, projects/*/ | analyze | git submodule status | 更新或修复 |
| 4 | 分支状态验证 | .git/refs/heads/ | analyze | git branch | 切换或创建分支 |
| 5 | 冲突文件检测 | 冲突文件 | analyze | git status --porcelain | 解决冲突 |
| 6 | 生成Git状态报告 | 任务文档 | create | 报告完整 | - |

### 步骤依赖关系

- 步骤1 → 步骤2（检查后处理未追踪文件）
- 步骤2 → 步骤3（处理后检查子模块）
- 步骤3 → 步骤4（子模块正常后验证分支）
- 步骤4 → 步骤5（分支正常后检测冲突）
- 步骤5 → 步骤6（检测完成后生成报告）

### 自规划验证检查点

- [ ] MCI-SP-01: 自规划已完成并写入自身分区
- [ ] MCI-SP-02: 自规划内容未跨分区写入
- [ ] MCI-SP-03: 所有步骤精确到文件路径
- [ ] MCI-SP-04: 每个步骤包含验证节点
- [ ] MCI-SP-05: 每个步骤包含失败处理预案

### 失败处理预案

| 失败场景 | 处理方式 | 回退方案 |
|----------|----------|----------|
| 子模块状态异常 | git submodule update | 重新初始化 |
| 存在冲突文件 | 手动解决冲突 | 暂停并报告 |
| 子模块detached HEAD | 切换到正确分支 | 恢复分支 |

## 执行记录

### 自规划阶段 [2026-06-01]

[自规划内容写入此处]

---

### 执行阶段 [时间戳]

[执行记录写入此处]

---

## 验收标准

### 工作目录状态

- [ ] 工作目录clean或只有预期更改
- [ ] 无未追踪的重要文件
- [ ] 无未合并的冲突文件

### 子模块状态

- [ ] 所有子模块状态正常
- [ ] 子模块HEAD与父仓库记录一致
- [ ] 无子模块处于detached HEAD状态

### 分支状态

- [ ] 当前分支正确
- [ ] 与远程分支追踪关系正确

## 注意事项

### 状态判定规则

| 状态 | 含义 | 处理方式 |
|------|------|----------|
| clean | 无更改 | 可继续 |
| modified | 有未提交更改 | 检查并提交或撤销 |
| untracked | 有新增文件 | 添加到.gitignore或提交 |
| conflict | 有冲突未解决 | 必须先解决冲突 |

### 依赖关系

- 前置任务：无
- 技术依赖：git
- 人员依赖：无
