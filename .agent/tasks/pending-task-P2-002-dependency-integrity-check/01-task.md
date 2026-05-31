---
id: task-002
version: 1.0.0
taskType: analysis
projectContext: projects/ControlX
priority: P2
status: pending
created: 2026-06-01
sourceTemplate: routine-002-dependency-integrity-check.md
---

# Task: 依赖完整性检测

## 元信息

- taskId: 002
- status: pending
- priority: P2
- created: 2026-06-01
- sourceTemplate: routine-002-dependency-integrity-check.md

## 任务目标

检查ControlX项目依赖文件的完整性，验证所有依赖是否可用，检测版本一致性问题。

## 任务类型

| 字段 | 内容 |
|------|------|
| 任务类型 | analysis |
| 项目上下文 | projects/ControlX |
| 操作范围 | /workspaces/agent-workspace/projects/ControlX/ |

## 背景说明

ControlX使用pnpm和turbo作为monorepo管理工具。需要验证package.json、pnpm-lock.yaml等依赖文件完整性和可用性。

## 任务范围

### 涉及文件

| 文件路径 | 操作类型 | 说明 |
|----------|----------|------|
| package.json | read | 根依赖声明 |
| pnpm-lock.yaml | read | pnpm锁定文件 |
| apps/*/package.json | read | 应用依赖 |
| packages/*/package.json | read | 包依赖 |

### 命令列表

| 命令 | 类型 | 说明 |
|------|------|------|
| pnpm list --depth=0 | tmux+Docker | 列出直接依赖 |
| pnpm audit | tmux+Docker | 安全审计 |
| pnpm outdated | tmux+Docker | 检查过时依赖 |

### 边界约束

- **包含**：所有package.json、pnpm-lock.yaml
- **排除**：node_modules

## 输出明确

### 预期产出

| 产出物 | 位置 | 验证方法 |
|--------|------|----------|
| 依赖报告 | 任务文档自身分区 | 版本和分析结果 |
| 问题清单 | 任务文档自身分区 | 发现的问题及建议 |

### 验证标准

- [ ] 依赖文件存在且格式正确
- [ ] 所有依赖都能被pnpm解析
- [ ] 锁文件与依赖文件版本一致
- [ ] 无未声明的依赖

## 五必备（自规划阶段强制要求）

### 执行步骤规划

| 步骤 | 描述 | 涉及文件 | 操作类型 | 验证方法 | 失败处理 |
|------|------|----------|----------|----------|----------|
| 1 | 识别依赖文件 | package.json, pnpm-lock.yaml | read | ls确认存在 | 检查文件位置 |
| 2 | 验证依赖文件存在性 | package.json | read | cat检查格式 | 修复JSON格式 |
| 3 | 依赖可用性检测 | 所有依赖 | analyze | pnpm list成功 | 重装依赖 |
| 4 | 版本一致性分析 | pnpm-lock.yaml | analyze | pnpm outdated | 更新锁文件 |
| 5 | 生成依赖报告 | 任务文档 | create | 报告完整 | - |

### 步骤依赖关系

- 步骤1 → 步骤2（识别后验证）
- 步骤2 → 步骤3（验证后检测可用性）
- 步骤3 → 步骤4（可用性确认后分析一致性）
- 步骤4 → 步骤5（分析完成后生成报告）

### 自规划验证检查点

- [ ] MCI-SP-01: 自规划已完成并写入自身分区
- [ ] MCI-SP-02: 自规划内容未跨分区写入
- [ ] MCI-SP-03: 所有步骤精确到文件路径
- [ ] MCI-SP-04: 每个步骤包含验证节点
- [ ] MCI-SP-05: 每个步骤包含失败处理预案

### 失败处理预案

| 失败场景 | 处理方式 | 回退方案 |
|----------|----------|----------|
| pnpm不可用 | 检查Node/pnpm安装 | 使用npm替代 |
| 锁文件过期 | 运行pnpm install | 备份后更新 |
| 依赖冲突 | 检查版本范围 | 调整版本约束 |

## 执行记录

### 自规划阶段 [2026-06-01]

[自规划内容写入此处]

---

### 执行阶段 [时间戳]

[执行记录写入此处]

---

## 验收标准

### 完整性检查

- [ ] 依赖文件存在且格式正确
- [ ] 所有依赖都能被包管理器解析
- [ ] 无未声明的依赖
- [ ] 锁文件与依赖文件版本一致

### 可用性检查

- [ ] 所有依赖包可用（未下架）
- [ ] 无版本冲突
- [ ] 依赖完整性验证通过

## 注意事项

### 常见问题

1. **依赖版本冲突**：需要升级/降级某些包
2. **锁文件过期**：需要运行pnpm install更新
3. **私有包不可用**：需要检查pnpm registry配置

### 依赖关系

- 前置任务：无
- 技术依赖：pnpm/npm
- 人员依赖：无
