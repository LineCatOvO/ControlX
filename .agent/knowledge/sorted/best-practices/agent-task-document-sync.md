# 最佳实践：代理任务中的文档与代码同步

## 元信息
- 版本：1.0.0
- 最后修改：2026-05-02
- 作者：Learner
- 分类：最佳实践
- 验证状态：已验证 (task-P1-003)

## 摘要

记录在代理驱动开发流程中，任务文档状态与项目文档（TASKS.md、README.md）保持同步的标准化方法和常见陷阱。

## 问题背景

在Agent协作开发中，代码实现与文档状态很容易出现不同步。典型情况：
1. 代码已完成实现，但TASKS.md中的对应checkbox仍标记为`[ ]`
2. README.md中的统计数据未更新
3. 任务文档中的验收标准与实际代码状态不一致

## 同步规范

### 1. 核心文档状态同步清单

每次任务完成后必须检查以下同步点：

| 文档 | 同步内容 | 更新方式 |
|------|---------|---------|
| TASKS.md | Checkbox状态 [ ] → [x] | 逐项验证代码后更新 |
| TASKS.md | 统计表格数据 | 重新计算已完成任务数 |
| README.md | 任务概览表格 | 同步于TASKS.md统计 |
| README.md | P0/P1/P2子任务状态 | 逐项关联代码验证 |
| 任务文档自身 | 验收标准checkbox | 标记已完成项 |
| 任务文档自身 | Planner状态更新 | Coder完成时间/Reviewer通过时间 |

### 2. 常见陷阱

**陷阱1：代码完成但checkbox未更新**
- P0-P2任务中的600+个checkbox，部分状态可能过时
- 解决方案：对比最新git log找出实际已实现的功能，逐个验证checkbox

**陷阱2：标记[x]但实际代码为"待实现"**
```markdown
# 错误示例
- [x] 10.3.3 测试网络中断（待实现）
- [x] 10.3.4 测试应用崩溃（待实现）
```
- 应改为：
```markdown
- [x] 10.3.3 测试网络中断（network-disconnection.test.ts, 800行）
- [x] 10.3.4 测试应用崩溃（app-crash-recovery.test.ts, 546行）
```

**陷阱3：文档中的统计数值不一致**
- TASKS.md显示总计14个任务（6 P0 + 4 P1 + 4 P2）
- README.md显示总计10个任务（4 P0 + 3 P1 + 3 P2）
- 原因：构建与部署相关的P0/P1任务未计入README摘要

### 3. 验证流程

```
1. git log 获取近期代码提交
       ↓
2. 对比TASKS.md中的checkbox状态
       ↓
3. 找到[x]但代码未实现的项目
       ↓
4. 验证代码文件是否存在（确认实现）
       ↓
5. 更新checkbox描述（从"待实现"改为具体文件引用）
       ↓
6. 重新计算统计表格数据
       ↓
7. 同步更新README.md
```

### 4. 守旧原则

- 仅更新确认已完成的checkbox → [x]
- 未实现的低优先级任务保留 [ ]
- 已确认失效/过期的任务移入failed/
- 禁止对未验证状态的任务标记 [x]

## 应用场景

- Agent协作开发后的文档收尾
- 项目状态汇报前的文档审核
- CI/CD流程中的文档自动验证
- 开源项目的CHANGELOG/ROADMAP维护

## 验证结果

task-P1-003执行验证：
- P0: 6/6 全部完成 ✅
- P1: 4/4 全部完成 ✅
- P2: 4/4 全部完成 ✅
- README.md P0/P1/P2子任务全部 [x] ✅
- 修复3处"待实现"残留文本 ✅

## 相关文件

- [TASKS.md](file:///workspaces/agent-workspace/projects/ControlX/TASKS.md)
- [README.md](file:///workspaces/agent-workspace/projects/ControlX/README.md)
- [task-P1-003](file:///workspaces/agent-workspace/projects/ControlX/.agent/tasks/completed/task-P1-003-sync-tasks-document.md)

## 标签

- document-sync
- task-management
- checklist
- best-practice
- agent-workflow
- controlx
