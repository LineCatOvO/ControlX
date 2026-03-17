Feature: 异常处理与恢复
  As a 赛车游戏玩家
  I want to 系统在异常情况下能够安全恢复
  So that 我可以避免因异常导致的控制失控

  Background: 控制服务已启动
    Given 应用已启动
    And 服务状态为"已启动"
    And WebSocket连接已建立

  Scenario: WebSocket连接断开
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When WebSocket连接意外断开
    Then 系统应检测到连接断开
    And 系统应立即清零所有控制输出
    And 系统应显示连接断开提示
    And 系统应尝试自动重连

  Scenario: WebSocket自动重连成功
    Given WebSocket连接已断开
    And 系统正在尝试重连
    When 后端服务恢复可用
    Then 系统应成功重新建立连接
    And 系统应显示连接恢复提示
    And 控制状态应保持为零（需用户重新启用）

  Scenario: WebSocket重连失败
    Given WebSocket连接已断开
    And 系统已尝试多次重连
    When 重连持续失败超过阈值
    Then 系统应停止重连尝试
    And 系统应显示连接失败提示
    And 系统应建议用户检查后端服务

  Scenario: 后端服务崩溃
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 后端服务崩溃
    Then 客户端应检测到连接异常
    And 客户端应清零所有控制输出
    And 后端应独立清零所有控制状态（超时机制）
    And 最终状态应等价于无控制输出

  Scenario: 后端服务重启
    Given 后端服务已崩溃并重启
    And 客户端仍在运行
    When 后端服务重新可用
    Then 客户端应能重新建立连接
    And 连接应正常工作
    And 控制状态应从零开始

  Scenario: 客户端崩溃
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 客户端应用崩溃
    Then 后端应检测到连接断开
    And 后端应通过超时机制清零控制状态
    And 最终状态应等价于无控制输出

  Scenario: 客户端崩溃后重启
    Given 客户端已崩溃
    When 用户重新启动客户端
    Then 客户端应正常启动
    And 服务状态应显示为"未启动"
    And 不应存在残留的控制状态
    And 之前的配置应被保留

  Scenario: 网络短暂中断
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 网络短暂中断（小于1秒）
    Then 系统应缓存控制状态
    And 网络恢复后应发送最新状态
    And 不应产生控制状态混乱

  Scenario: 网络长时间中断
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 网络中断超过阈值时间
    Then 系统应清零控制输出
    And 系统应显示网络异常提示
    And 网络恢复后需要用户重新启用控制

  Scenario: 输入处理异常
    Given 控制处于启用状态
    When 输入处理过程中发生异常
    Then 异常应被隔离
    And 异常不应影响其他功能
    And 系统应记录异常信息
    And 系统应尝试恢复正常运行

  Scenario: 布局加载失败
    Given 用户尝试加载布局
    When 布局文件损坏或格式错误
    Then 系统应检测到加载失败
    And 系统应显示错误提示
    And 系统应加载默认布局
    And 应用应继续正常运行

  Scenario: 布局保存失败
    Given 用户编辑布局后尝试保存
    When 存储空间不足或权限问题导致保存失败
    Then 系统应检测到保存失败
    And 系统应显示错误提示
    And 系统应保留编辑中的布局（内存中）
    And 用户应能重试保存

  Scenario: 内存不足
    Given 系统运行正常
    When 设备内存严重不足
    Then 系统应优先保持控制服务运行
    And 非必要功能应被暂停
    And 系统应尝试释放非关键资源
    And 控制输出应保持稳定

  Scenario: 传感器异常
    Given 陀螺仪输入已启用
    When 陀螺仪传感器发生异常
    Then 系统应检测到传感器异常
    And 系统应禁用陀螺仪输入
    And 触控输入应继续正常工作
    And 系统应显示传感器异常提示

  Scenario: 悬浮窗权限被撤销
    Given 悬浮窗已显示
    And 控制服务正在运行
    When 用户在系统设置中撤销悬浮窗权限
    Then 悬浮窗应被移除
    And 控制服务应继续运行
    And 系统应显示权限缺失提示
    And 用户应能通过主界面继续使用控制功能

  Scenario: 来电中断
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 用户接到来电
    Then 系统应检测到来电
    And 控制输出应被清零
    And 来电结束后用户可重新启用控制

  Scenario: 其他应用抢占
    Given 控制处于启用状态
    When 其他应用抢占焦点
    Then 控制服务应继续运行
    And 悬浮窗应保持可用
    And 用户应能继续通过悬浮窗控制

  Scenario: 系统强制停止
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 系统强制停止应用
    Then 后端应通过超时机制清零控制状态
    And 最终状态应等价于无控制输出

  Scenario: 异常隔离原则
    Given 系统正在运行
    When 任何单一功能发生异常
    Then 异常应被隔离在该功能范围内
    And 异常不应扩散到其他功能
    And 系统整体应保持稳定

  Scenario: 安全回退状态
    Given 任何异常情况发生
    When 系统进入异常处理流程
    Then 最终状态必须等价于"没有任何控制输出"
    And 键盘按键应全部释放
    And 手柄状态应全部归零
    And 不应存在残留控制状态

  Scenario: 异常恢复后状态一致性
    Given 系统从异常中恢复
    When 用户重新启用控制
    Then 系统应从零状态开始
    And 不应存在异常前的残留状态
    And 控制行为应正常

  Scenario: 异常日志记录
    Given 任何异常发生
    When 系统处理异常
    Then 系统应记录异常类型
    And 系统应记录异常时间
    And 系统应记录异常上下文
    And 日志应可用于问题诊断

  Scenario: 用户可感知的异常反馈
    Given 任何异常发生
    When 系统检测到异常
    Then 系统应向用户显示明确的异常提示
    And 提示应说明异常类型
    And 提示应提供可能的解决方案
    And 用户应能理解发生了什么

  Scenario: 超时自动清零
    Given 控制处于启用状态
    And 后端超时清零设置为500ms
    When 客户端停止发送控制数据
    And 超过500ms未收到新数据
    Then 后端应自动清零所有控制状态
    And 最终状态应等价于无控制输出