# Task Document: setupEnv.ts Integration to jest.config

## Meta Information

| Field | Value |
|-------|-------|
| Task ID | task-P1-001-setupenv-jest |
| Priority | P1 |
| Created | 2026-05-02 |
| Status | pending |
| Original Task | Task 1: setupEnv.ts 挂接 jest.config |
| Agent | Coder |

## Task Objective

在 `Server/jest.config.js` 中添加 `setupFiles` 配置，使 `Server/tests/setupEnv.ts` 在测试运行时被加载。

## Task Background

- **Input File 1**: `Server/tests/setupEnv.ts` - 已创建的环境配置脚本，设置 `TEST_MODE`, `DISABLE_ACTUAL_INPUT`, `DRY_RUN` 环境变量
- **Input File 2**: `Server/jest.config.js` - Jest 配置文件，缺少 `setupFiles` 配置
- **Issue**: setupEnv.ts 已创建但未被 jest.config.js 引用，导致测试环境变量配置不生效

## Input Files

| File Path | Purpose |
|-----------|---------|
| `Server/tests/setupEnv.ts` | 环境配置脚本，设置测试环境变量 |
| `Server/jest.config.js` | Jest 配置文件，需要添加 setupFiles |

## Output Files

| File Path | Purpose |
|-----------|---------|
| `Server/jest.config.js` | 更新后的 Jest 配置，添加 setupFiles |

## Task Content

### 1. Verification: Multi-File Analysis

- [x] 已读取 `Server/tests/setupEnv.ts` - 确认内容为环境变量设置（3行代码）
- [x] 已读取 `Server/jest.config.js` - 确认配置结构，无 setupFiles 字段
- [x] 确认两文件路径正确且可访问

### 2. Execution Plan

在 `jest.config.js` 中添加 `setupFiles` 配置项：

```javascript
setupFiles: ['<rootDir>/tests/setupEnv.ts']
```

## Acceptance Criteria

- [ ] jest.config.js 包含 `setupFiles` 配置项
- [ ] setupFiles 指向 `tests/setupEnv.ts`
- [ ] 配置语法正确（Jest 可正常加载）
- [ ] 测试运行时可验证环境变量生效（可选）

## Execution Branches

### Success Path
- 修改 jest.config.js，添加 setupFiles 配置
- 验证配置语法正确

### Failure Path
- 若修改后配置导致测试报错，回滚更改
- 报告错误信息

## Reference Rules

- AGENTS_GENERAL.xml: 测试规范（优先使用 Docker）
- AGENTS_PLANNER.xml: 任务文档规范、验收标准 checkbox 格式