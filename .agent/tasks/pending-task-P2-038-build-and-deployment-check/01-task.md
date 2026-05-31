---
id: task-038
version: 1.0.0
taskType: verification
projectContext: projects/ControlX
priority: P2
status: pending
created: 2026-06-01
sourceTemplate: routine-038-build-and-deployment-check.md
---

# Task: 构建部署检查

## 元信息

- taskId: 038
- status: pending
- priority: P2
- created: 2026-06-01
- sourceTemplate: routine-038-build-and-deployment-check.md

## 任务目标

验证ControlX构建成功率、部署流程完整性、回滚机制有效性，确保项目可可靠部署。

## 任务类型

| 字段 | 内容 |
|------|------|
| 任务类型 | verification |
| projectContext | projects/ControlX |
| 操作范围 | /workspaces/agent-workspace/projects/ControlX/ |

## 背景说明

ControlX发布前需要验证构建和部署流程，确保可以可靠部署。

## 任务范围

### 涉及文件

| 文件路径 | 操作类型 | 说明 |
|----------|----------|------|
| Dockerfile | read | Docker配置 |
| docker-compose.yml | read | 部署配置 |
| turbo.json | read | 构建配置 |
| scripts/rollback.sh | read | 回滚脚本 |

### 命令列表

| 命令 | 类型 | 说明 |
|------|------|------|
| npm run build | tmux+Docker | 构建测试 |
| docker build -t test-image:latest . | tmux+Docker | 镜像构建 |
| docker-compose up -d | tmux+Docker | 部署验证 |

### 边界约束

- **包含**：构建和部署配置
- **排除**：node_modules

## 输出明确

### 预期产出

| 产出物 | 位置 | 验证方法 |
|--------|------|----------|
| 构建日志 | test-reports/build.log | 构建输出 |
| Docker日志 | test-reports/docker-build.log | 镜像构建日志 |
| 部署报告 | test-reports/deploy/ | 验证结果 |

### 验证标准

- [ ] npm build 成功
- [ ] Docker镜像构建成功
- [ ] 服务启动成功
- [ ] 健康检查通过

## 五必备（自规划阶段强制要求）

### 执行步骤规划

| 步骤 | 描述 | 涉及文件 | 操作类型 | 验证方法 | 失败处理 |
|------|------|----------|----------|----------|----------|
| 1 | 构建环境检查 | package.json, Dockerfile | analyze | 环境检查 | 修复配置 |
| 2 | 构建成功率验证 | turbo.json, apps/*/ | execute | 构建成功 | 修复构建问题 |
| 3 | Docker镜像构建 | Dockerfile | execute | 镜像构建成功 | 修复Dockerfile |
| 4 | 部署流程验证 | docker-compose.yml | execute | 服务启动成功 | 修复配置 |
| 5 | 回滚机制检查 | scripts/rollback.sh | analyze | 回滚脚本可用 | 创建或修复 |
| 6 | 生成构建部署报告 | test-reports/deploy/ | create | 报告完整 | 审核 |

### 步骤依赖关系

- 步骤1 → 步骤2（环境检查后验证构建）
- 步骤2 → 步骤3（构建成功后构建镜像）
- 步骤3 → 步骤4（镜像构建后验证部署）
- 步骤4 → 步骤5（部署验证后检查回滚）
- 步骤5 → 步骤6（回滚检查后生成报告）

### 自规划验证检查点

- [ ] MCI-SP-01: 自规划已完成并写入自身分区
- [ ] MCI-SP-02: 自规划内容未跨分区写入
- [ ] MCI-SP-03: 所有步骤精确到文件路径
- [ ] MCI-SP-04: 每个步骤包含验证节点
- [ ] MCI-SP-05: 每个步骤包含失败处理预案

### 失败处理预案

| 失败场景 | 处理方式 | 回退方案 |
|----------|----------|----------|
| 构建失败 | 分析构建日志 | 修复构建配置 |
| 镜像构建失败 | 检查Dockerfile | 修复Dockerfile |
| 服务启动失败 | 检查docker-compose | 修复配置 |
| 回滚脚本缺失 | 创建标准脚本 | 参考模板 |

## 执行记录

### 自规划阶段 [2026-06-01]

[自规划内容写入此处]

---

### 执行阶段 [时间戳]

[执行记录写入此处]

---

## 验收标准

### 构建成功

- [ ] npm build 成功
- [ ] 无编译警告
- [ ] 产物完整

### 部署成功

- [ ] Docker镜像构建成功
- [ ] 服务启动成功
- [ ] 健康检查通过

### 回滚机制

- [ ] 回滚脚本可用
- [ ] 版本标签正确
- [ ] 回滚测试通过

## 注意事项

### 部署原则

1. **幂等性**：部署可重复执行
2. **可回滚**：支持回滚到上一版本
3. **最小停机**：部署应快速完成

### 依赖关系

- 前置任务：代码开发完成
- 技术依赖：Docker、pnpm
- 人员依赖：无
