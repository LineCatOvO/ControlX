Feature: 异常处理
  作为 ControlX 用户
  我想要系统在异常情况下安全处理
  以便避免产生危险的控制结果

  Background:
    Given ControlX 应用已启动
    And WebSocket 连接已建立
    And 控制功能已启用

  Scenario: 异常隔离机制
    Given 控制功能正在运行
    When 某个功能模块发生异常
    Then 异常被隔离在模块内
    And 不影响其他模块运行
    And 系统继续稳定运行
    And 用户收到异常提示

  Scenario: 安全回退机制
    Given 控制功能正在运行
    And 发生严重异常
    When 安全机制介入
    Then 系统回退到安全状态
    And 所有控制结果清空
    And 键盘按键释放
    And 手柄状态归零
    And 不存在残留控制状态
    And 用户收到安全回退提示

  Scenario: 状态清空机制
    Given 控制功能正在运行
    And 控制结果正在生成
    When 异常中断发生
    Then 所有控制状态立即清空
    And 键盘按键释放
    And 手柄状态归零
    And 不存在残留控制状态
    And 最终状态等价于无控制输出

  Scenario: 异常恢复机制
    Given 系统发生异常
    And 安全回退已完成
    When 异常原因消除
    Then 系统可恢复正常运行
    And 用户可重新启用控制
    And 控制功能恢复正常

  Scenario: 异常日志记录
    Given 系统发生异常
    When 异常处理完成
    Then 异常信息被记录
    And 异常时间被记录
    And 异常原因被记录
    And 异常处理结果被记录
    And 用户可查看异常日志

  Scenario: 异常不影响连接
    Given WebSocket 连接已建立
    And 系统发生异常
    When 安全回退完成
    Then WebSocket 连接保持
    And 连接状态不受影响
    And 用户可继续使用应用