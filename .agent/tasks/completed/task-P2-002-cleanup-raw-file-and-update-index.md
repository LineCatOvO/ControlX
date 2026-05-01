# Task Document: P2-002 - 清理 raw 文件并更新索引

## 元信息

| 字段 | 内容 |
|------|------|
| 任务ID | P2-002 |
| 任务标题 | cleanup-raw-file-and-update-index |
| 优先级 | P2 |
| 创建时间 | 2026-05-02 |
| 来源 | Learner |
| 操作范围 | /workspaces/agent-workspace/projects/ControlX/ |

## 任务背景

Learner 报告以下问题需要处理：

1. **raw 文件迁移后未清理** - `raw/experiences/2026-05-02-docker-multi-stage-build-001.md` 应删除
2. **知识库索引未更新** - `.agent/knowledge/README.md` 需要记录新迁移文件
3. **sorted 文件应增加组织结构改进**（索引信息、交叉引用）

## 任务目标

1. 删除 `raw/experiences/2026-05-02-docker-multi-stage-build-001.md`
2. 更新 `.agent/knowledge/README.md` 记录 sorted/experiences/ 中的迁移文件
3. 在 sorted/experiences/ 文件中添加交叉引用和索引信息

## 任务内容

### 步骤 1: 删除 raw 文件

- 删除文件: `/workspaces/agent-workspace/projects/ControlX/raw/experiences/2026-05-02-docker-multi-stage-build-001.md`

### 步骤 2: 更新知识库索引

读取并更新 `/workspaces/agent-workspace/projects/ControlX/.agent/knowledge/README.md`，确保记录了 sorted/experiences/ 中的所有迁移文件信息。

### 步骤 3: 添加索引和交叉引用

在 sorted/experiences/ 目录的文件中添加:
- 索引信息（文件清单、分类）
- 交叉引用（相关文件链接）

## 验收标准

- [ ] `raw/experiences/2026-05-02-docker-multi-stage-build-001.md` 已删除
- [ ] `.agent/knowledge/README.md` 已更新，记录了 sorted/experiences/ 中的迁移文件
- [ ] sorted/experiences/ 文件包含索引信息和交叉引用

## 涉及文件

| 文件路径 | 操作 | 用途 |
|----------|------|------|
| `raw/experiences/2026-05-02-docker-multi-stage-build-001.md` | 删除 | 清理已迁移的 raw 文件 |
| `.agent/knowledge/README.md` | 读取/更新 | 知识库索引文件 |
| `sorted/experiences/` | 读取/更新 | 添加索引和交叉引用 |

## 执行分支

### 成功路径
任务正常完成，所有验收标准满足。

### 失败路径
- 如果 `raw/experiences/2026-05-02-docker-multi-stage-build-001.md` 不存在，记录警告但继续执行。
- 如果 `sorted/experiences/` 目录不存在或为空，记录警告但继续执行。

## 参考规则

- AGENTS_GENERAL.xml: workspaceStructure, knowledgeBase
- AGENTS_PLANNER.xml: TaskDocumentValidationResponsibility

## 任务状态

| 状态 | 更新时间 | 更新人 |
|------|----------|--------|
| Pending | 2026-05-02 | Planner |