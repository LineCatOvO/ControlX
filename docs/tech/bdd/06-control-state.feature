Feature: 控制状态管理
  作为 ControlX 用户
  我想要启用或禁用控制功能
  以便控制控制结果的生成

  Background:
    Given ControlX 应用已启动
    And WebSocket 连接已建立
    And 布局已加载

  Scenario: 启用控制
    Given 控制功能已禁用
    And 布局已加载
    When 用户启用控制
    Then 控制结果开始生成
    And 不影响布局状态
    And 不影响配置状态
    And 不影响连接状态
    And 控制结果发送到执行端

  Scenario: 禁用控制
    Given 控制功能已启用
    And 控制结果正在生成
    When 用户禁用控制
    Then 不产生任何控制结果
    And 所有控制结果清空
    And 不影响布局状态
    And 不影响配置状态
    And 不影响连接状态
    And 不存在残留控制状态

  Scenario: 安全切断
    Given 控制功能已启用
    And 控制结果正在生成
    When 安全机制介入
    Then 立即进入零输出状态
    And 所有控制结果清空
    And 提供可感知中断反馈
    And 不存在残留控制状态
    And 用户可重新启用控制

  Scenario: 控制默认全局生效
    Given 控制功能已启用
    And 布局已加载
    When 控制结果生成
    Then 控制默认全局生效
    And 不基于当前应用筛选
    And 控制结果发送到所有执行端

  Scenario: 控制作用范围配置
    Given 控制功能已启用
    And 布局包含作用范围配置
    When 控制结果生成
    Then 控制结果按作用范围发送
    And 作用范围可配置
    And 作用范围不影响控制生成

  Scenario: 控制状态不影响连接
    Given WebSocket 连接已建立
    When 用户禁用控制
    Then WebSocket 连接保持
    And 连接状态不受影响
    And 用户可重新启用控制

  Scenario: 控制状态不影响布局
    Given 布局已加载
    When 用户禁用控制
    Then 布局状态保持
    And 布局配置不受影响
    And 用户可重新启用控制
    And 控制结果基于原布局生成