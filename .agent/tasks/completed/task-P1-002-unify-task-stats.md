# Task Document: Unify TASKS.md and README.md Statistics

## Meta Information

| Field | Value |
|-------|-------|
| Task ID | task-P1-002-unify-task-stats |
| Priority | P1 |
| Created | 2026-05-02 |
| Status | pending |
| Original Task | Task 2: 统一 TASKS.md 与 README.md 统计口径 |
| Agent | Coder |

## Task Objective

统一 `TASKS.md` 与 `README.md` 的任务统计数据，确保两文档反映一致的信息，或明确注释说明差异原因。

## Task Background

**Issue**: 两个文档的任务统计存在不一致：

| 文档 | P0 | P1 | P2 | 总计 |
|------|----|----|-----|------|
| TASKS.md | 6/6 | 4/4 | 4/4 | 14/14 |
| README.md | 4/4 | 3/3 | 3/3 | 10/10 |

**Analysis**:
- TASKS.md 包含额外的 P0 任务（"构建与部署"部分，5.x/6.x）
- README.md 简化了任务列表，只显示核心任务
- 两个文档都是正确的，只是统计范围不同

## Input Files

| File Path | Purpose |
|-----------|---------|
| `TASKS.md` | 详细任务文档，包含完整的任务分解和子任务统计 |
| `README.md` | 项目概述文档，包含简化的任务概览 |

## Output Files

| File Path | Purpose |
|-----------|---------|
| `README.md` | 更新后的项目概述文档，统计口径与 TASKS.md 一致或添加说明 |

## Task Content

### 1. Verification: Multi-File Analysis

- [x] 已读取 `TASKS.md` - 确认统计为 P0:6, P1:4, P2:4，总计14
- [x] 已读取 `README.md` - 确认统计为 P0:4, P1:3, P2:3，总计10
- [x] 分析差异原因：TASKS.md 包含"构建与部署"章节（P0-5.x/6.x），README.md 未包含

### 2. Root Cause Analysis

TASKS.md 有两个位置的任务列表：
1. **第一处** (lines 5-12): P0:6, P1:4, P2:4, 总计14
2. **第二处** (lines 135-840): 详细任务展开，包含构建与部署章节

README.md 的任务列表 (lines 18-58) 只包含核心功能任务，缺少构建与部署任务。

### 3. Execution Options

**Option A**: 更新 README.md 使其包含所有任务统计（推荐）
- 将 README.md 的任务表更新为 P0:6, P1:4, P2:4, 总计14

**Option B**: 在 README.md 中添加注释说明差异
- 说明 TASKS.md 包含构建与部署任务，README.md 仅列出核心功能

## Acceptance Criteria

- [ ] README.md 任务统计与 TASKS.md 一致，或
- [ ] README.md 添加注释说明统计口径差异
- [ ] 更新后的统计数据准确反映项目任务状态

## Execution Branches

### Success Path
- 更新 README.md 的任务统计表
- 或添加注释说明统计口径差异

### Failure Path
- 若无法确定正确的统计口径，报告差异分析结果

## Reference Rules

- AGENTS_GENERAL.xml: 文档同步规范
- AGENTS_PLANNER.xml: 任务文档规范、验收标准 checkbox 格式