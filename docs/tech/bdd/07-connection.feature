Feature: 连接管理
  作为 ControlX 系统
  我想要管理 WebSocket 连接
  以便保证控制结果可靠传输

  Background:
    Given ControlX 应用已启动
    And 后端服务已启动

  Scenario: WebSocket 连接建立
    Given 后端 WebSocket 服务可用
    When ControlX 应用启动
    Then WebSocket 连接建立
    And 控制数据持续发送
    And 连接状态正常
    And 延迟 ≤50ms

  Scenario: 连接校验
    Given WebSocket 连接已建立
    When 连接异常发生
    Then 提示用户连接信息缺失
    And 明确告知连接失败
    And 用户可尝试重新连接

  Scenario: 连接恢复
    Given WebSocket 连接已建立
    And 短暂中断发生
    When 连接恢复
    Then 连接重新建立
    And 中断期间控制结果安全
    And 不存在残留控制状态
    And 控制结果继续发送

  Scenario: 连接断开
    Given WebSocket 连接已建立
    And 控制结果正在发送
    When 连接中断
    Then 清空所有控制结果
    And 最终状态等价于无控制输出
    And 不存在残留控制状态
    And 用户收到连接断开提示

  Scenario: ACK 确认机制
    Given WebSocket 连接已建立
    And 控制结果发送
    When 执行端接收控制结果
    Then ACK 确认返回
    And 发送端确认控制结果送达
    And 未确认时重试发送

  Scenario: 延迟检测与告警
    Given WebSocket 连接已建立
    And 控制结果正在发送
    When 延迟检测运行
    Then 延迟 ≤50ms 时正常
    And 延迟 >50ms 时警告
    And 延迟 >100ms 时严重警告
    And 用户收到延迟告警提示

  Scenario: 控制结果发送策略-状态发送
    Given WebSocket 连接已建立
    And 布局配置状态发送模式
    And 控制功能已启用
    When 控制结果生成
    Then 控制结果按状态发送
    And 状态变化触发发送
    And 发送频率可配置

  Scenario: 控制结果发送策略-事件发送
    Given WebSocket 连接已建立
    And 布局配置事件发送模式
    And 控制功能已启用
    When 控制结果生成
    Then 控制结果按事件发送
    And 事件触发发送
    And 发送频率可配置

  Scenario: 至少启用一种发送模式
    Given WebSocket 连接已建立
    And 控制功能已启用
    When 控制结果生成
    Then 至少启用一种发送模式
    And 状态发送或事件发送可用
    And 控制结果可靠传输