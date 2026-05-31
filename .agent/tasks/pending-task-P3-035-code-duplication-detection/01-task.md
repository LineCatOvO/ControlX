---
id: task-035
version: 1.0.0
taskType: analysis
projectContext: projects/ControlX
priority: P3
status: pending
created: 2026-06-01
sourceTemplate: routine-035-code-duplication-detection.md
---

# Task: 代码重复检测

## 元信息

- taskId: 035
- status: pending
- priority: P3
- created: 2026-06-01
- sourceTemplate: routine-035-code-duplication-detection.md

## 任务目标

识别ControlX项目中的重复代码和相似代码，分析重复原因，生成重构建议以消除重复。

## 任务类型

| 字段 | 内容 |
|------|------|
| 任务类型 | analysis |
| 项目上下文 | projects/ControlX |
| 操作范围 | /workspaces/agent-workspace/projects/ControlX/ |

## 背景说明

ControlX需要检测代码重复，减少维护成本和潜在bug。

## 任务范围

### 涉及文件

| 文件路径 | 操作类型 | 说明 |
|----------|----------|------|
| src/**/*.ts | read | 源代码 |

### 命令列表

| 命令 | 类型 | 说明 |
|------|------|------|
| npx jscpd --pattern "src/**/*.{js,ts}" --output test-reports/duplication/ | tmux+Docker | 重复检测 |

### 边界约束

- **包含**：src/目录
- **排除**：node_modules

## 输出明确

### 预期产出

| 产出物 | 位置 | 验证方法 |
|--------|------|----------|
| 重复检测报告 | test-reports/duplication/ | 详细报告 |
| 重复代码位置 | test-reports/duplication/duplicates.json | 结构化数据 |

### 验证标准

- [ ] 重复率 < 10%
- [ ] 高重复代码有重构计划

## 五必备（自规划阶段强制要求）

### 执行步骤规划

| 步骤 | 描述 | 涉及文件 | 操作类型 | 验证方法 | 失败处理 |
|------|------|----------|----------|----------|----------|
| 1 | 重复检测工具配置 | package.json | analyze | 工具可用性 | 安装工具 |
| 2 | 执行重复检测 | src/**/*.ts | analyze | jscpd报告 | 记录结果 |
| 3 | 分析重复代码 | 检测结果 | analyze | 分析重复原因 | 记录分析 |
| 4 | 相似代码分析 | src/**/*.ts | analyze | 相似度分析 | 记录问题 |
| 5 | 生成重复检测报告 | test-reports/duplication/ | create | 报告完整 | 审核 |

### 步骤依赖关系

- 步骤1 → 步骤2（配置后执行检测）
- 步骤2 → 步骤3（检测后分析原因）
- 步骤3 → 步骤4（原因分析后分析相似）
- 步骤4 → 步骤5（相似分析后生成报告）

### 自规划验证检查点

- [ ] MCI-SP-01: 自规划已完成并写入自身分区
- [ ] MCI-SP-02: 自规划内容未跨分区写入
- [ ] MCI-SP-03: 所有步骤精确到文件路径
- [ ] MCI-SP-04: 每个步骤包含验证节点
- [ ] MCI-SP-05: 每个步骤包含失败处理预案

### 失败处理预案

| 失败场景 | 处理方式 | 回退方案 |
|----------|----------|----------|
| 工具不可用 | 手动检测 | 使用grep替代 |
| 重复率过高 | 标记优先重构 | 制定消除计划 |
| 无法消除重复 | 记录并说明原因 | 接受现状 |

## 执行记录

### 自规划阶段 [2026-06-01]

[自规划内容写入此处]

---

### 执行阶段 [时间戳]

[执行记录写入此处]

---

## 验收标准

### 重复控制

- [ ] 重复率 < 10%
- [ ] 高重复代码有重构计划

### 重构进度

- [ ] 重复代码已识别
- [ ] 重构建议已提供

## 注意事项

### 重复率标准

| 重复率 | 含义 | 行动 |
|--------|------|------|
| <5% | 优秀 | 保持 |
| 5-10% | 良好 | 小改进 |
| 10-20% | 一般 | 需要改进 |
| >20% | 严重 | 紧急重构 |

### 依赖关系

- 前置任务：无
- 技术依赖：jscpd工具
- 人员依赖：无
