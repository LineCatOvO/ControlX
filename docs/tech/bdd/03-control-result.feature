Feature: 控制结果生成
  作为 ControlX 系统
  我想要根据用户输入生成控制结果
  以便控制执行端行为

  Background:
    Given ControlX 应用已启动
    And WebSocket 连接已建立
    And 布局已加载
    And 控制功能已启用

  Scenario: 键盘控制结果生成
    Given 布局包含键盘映射
    And 用户输入触发键盘映射
    When 控制结果生成
    Then 生成键盘控制结果
    And 多按键同时生效
    And 异常中断后清空
    And 控制结果发送到执行端

  Scenario: 手柄控制结果生成
    Given 布局包含手柄映射
    And 用户输入触发手柄映射
    When 控制结果生成
    Then 生成手柄控制结果
    And 多轴多按键同时存在
    And 异常中断后重置
    And 控制结果发送到执行端

  Scenario: 控制结果组合
    Given 布局包含多种映射
    And 用户输入触发多种映射
    When 控制结果生成
    Then 同时生成多种控制结果
    And 不同控制结果互不排斥
    And 所有控制结果发送到执行端

  Scenario: 状态驱动模型
    Given 控制功能已启用
    And 用户输入持续
    When 控制结果生成
    Then 控制结果基于状态驱动
    And 状态变化触发控制结果更新
    And 控制刷新能力 ≥125Hz
    And 控制结果持续发送

  Scenario: 平滑处理
    Given 布局包含平滑参数
    And 用户输入变化
    When 控制结果生成
    Then 控制结果平滑处理
    And 平滑参数可配置
    And 控制结果无突变
    And 控制结果连续

  Scenario: 死区处理
    Given 布局包含死区参数
    And 用户输入在死区范围
    When 控制结果生成
    Then 控制结果忽略死区输入
    And 死区参数可配置
    And 死区外输入正常处理
    And 控制结果精确

  Scenario: 非线性映射
    Given 布局包含非线性映射参数
    And 用户输入变化
    When 控制结果生成
    Then 控制结果非线性映射
    And 映射曲线可配置
    And 控制结果符合预期曲线
    And 控制结果精确

  Scenario: 异常中断后清空
    Given 控制功能已启用
    And 控制结果正在生成
    When 异常中断发生
    Then 所有控制结果清空
    And 键盘按键释放
    And 手柄状态归零
    And 不存在残留控制状态
    And 系统可重新启动控制