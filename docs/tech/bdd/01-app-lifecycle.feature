Feature: 应用生命周期
  作为 ControlX 用户
  我想要启动和停止应用
  以便开始或结束控制会话

  Background:
    Given ControlX 后端服务可用

  Scenario: 应用启动
    Given ControlX 后端服务已启动
    And WebSocket 端点可用
    When 用户启动 ControlX 应用
    Then 应用成功启动
    And WebSocket 连接建立
    And 默认布局加载
    And 控制功能默认禁用
    And 用户界面显示

  Scenario: 应用停止
    Given ControlX 应用已启动
    And 控制功能已启用
    When 用户停止 ControlX 应用
    Then 应用成功停止
    And WebSocket 连接断开
    And 所有控制结果清空
    And 不存在残留控制状态
    And 用户界面关闭

  Scenario: 应用重启
    Given ControlX 应用已启动
    And 控制功能已启用
    When 用户重启 ControlX 应用
    Then 应用成功重启
    And WebSocket 连接重新建立
    And 默认布局重新加载
    And 控制功能默认禁用
    And 不存在残留控制状态

  Scenario: 后端服务启动
    Given ControlX 后端服务未启动
    When 用户启动后端服务
    Then 后端服务成功启动
    And WebSocket 端点可用
    And 控制结果接收端点可用
    And 服务状态正常

  Scenario: 后端服务停止
    Given ControlX 后端服务已启动
    And WebSocket 连接已建立
    When 用户停止后端服务
    Then 后端服务成功停止
    And WebSocket 连接断开
    And 所有控制结果清空
    And 不存在残留控制状态

  Scenario: 应用启动失败处理
    Given ControlX 后端服务未启动
    When 用户启动 ControlX 应用
    Then 应用启动失败
    And 用户收到启动失败提示
    And 明确告知连接失败
    And 用户可重新尝试启动

  Scenario: 应用异常停止处理
    Given ControlX 应用已启动
    And 控制功能已启用
    When 应用异常停止
    Then 所有控制结果清空
    And 不存在残留控制状态
    And WebSocket 连接断开
    And 用户收到异常停止提示