# ControlX 知识库索引

## 元信息
- 版本：1.1.0
- 最后更新：2026-04-29
- 维护者：Learner

## 知识库结构

```
.agent/knowledge/
├── raw/                    # 原始知识记录
├── sorted/                 # 整理后的知识
│   ├── patterns/          # 设计模式
│   ├── solutions/         # 解决方案
│   └── snippets/          # 代码片段
├── verified/              # 验证可靠的知识
├── user/                  # 用户确认的知识
└── refs/                  # 参考文件
```

## 知识条目索引

### 设计模式 (patterns/)

| 文件名 | 描述 | 标签 |
|--------|------|------|
| input-device-separation-pattern.md | 输入设备类型分离设计模式 | design-pattern, typescript, input-handling |

### 解决方案 (solutions/)

| 文件名 | 描述 | 标签 |
|--------|------|------|
| gamepad-state-mapping-solution.md | 游戏手柄状态映射完整实现 | gamepad, xinput, state-mapping |
| web-monitor-implementation.md | Web监控面板实现与Blessed迁移 | web-monitor, websocket, blessed-migration |

### 配置说明 (configs/)

| 文件名 | 描述 | 标签 |
|--------|------|------|
| android-rename-config.md | Android应用重命名完整指南 | rename, android, package-refactor |

### 代码片段 (snippets/)

| 文件名 | 描述 | 标签 |
|--------|------|------|
| optional-property-extraction-pattern.md | 可选属性安全提取模式 | typescript, null-safety |

### 原始记录 (raw/)

| 文件名 | 描述 | 日期 |
|--------|------|------|
| 2026-04-21-gamepad-input-state-mapping.md | 游戏手柄输入状态映射原始记录 | 2026-04-21 |
| 2026-04-29-web-monitor-implementation.md | Web监控面板实现与Blessed迁移原始记录 | 2026-04-29 |
| 2026-04-29-wmmt-to-controlx-rename.md | WMMT到ControlX项目重命名原始记录 | 2026-04-29 |

## 知识分级说明

- **raw**：即时记录执行过程中的有价值内容
- **sorted**：Learner 对 raw 内容进行整理与分类后的结构化知识
- **verified**：经严格验证后确认可靠的知识，用于长期复用
- **user**：由用户显式提供或确认的最高优先级知识

## 最近更新

### 2026-04-29
- 添加Web监控面板实现解决方案
- 添加Android重命名配置说明
- 添加Web监控实现原始记录
- 添加WMMT到ControlX重命名原始记录

### 2026-04-21
- 创建知识库目录结构
- 添加输入设备类型分离设计模式
- 添加游戏手柄状态映射解决方案
- 添加可选属性安全提取代码片段
- 整理原始知识记录

## 使用指南

1. **查询知识**：根据标签或分类在对应目录查找
2. **添加知识**：新知识先记录到 raw/ 目录
3. **整理知识**：由 Learner 将 raw 整理到 sorted/
4. **验证知识**：经 Reviewer 验证后可移动到 verified/
