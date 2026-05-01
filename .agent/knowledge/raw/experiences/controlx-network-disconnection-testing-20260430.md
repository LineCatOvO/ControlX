# ControlX 网络中断测试经验

## 元数据

- 版本：1.0.0
- 创建日期：2026-04-30
- 作者：Learner
- 任务ID：task-P0-004-network-disconnection-testing
- 执行结果：19 tests passed

## 关键发现

### 环境配置要求

测试环境需要设置以下环境变量：

| 变量 | 值 | 说明 |
|------|-----|------|
| TEST_MODE | true | 启用测试模式 |
| DISABLE_ACTUAL_INPUT | true | 禁用实际输入 |
| DRY_RUN | true | 启用 dry run 模式 |

### 依赖问题

1. **node-key-sender 依赖 Java 运行时**
   - node-key-sender 组件需要 Java 运行时环境
   - 测试环境中必须安装 JDK

### 初始化时序问题

1. **测试初始化时序问题需要通过 setupEnv.ts 解决**
   - 测试启动时的初始化顺序可能引发竞态条件
   - 解决方案是使用 setupEnv.ts 进行环境初始化

### Jest 配置

1. **jest.config.js 需要添加 setupFiles 配置**
   - 在 jest.config.js 中添加 `setupFiles` 指向初始化脚本
   - 确保测试环境在用例执行前正确设置

## 相关文件

- setupEnv.ts：环境初始化脚本
- jest.config.js：Jest 测试配置

## 标签

- controlx
- network-disconnection
- testing
- jest
- environment-setup
