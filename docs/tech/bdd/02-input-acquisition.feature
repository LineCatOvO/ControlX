Feature: 输入采集
  作为 ControlX 系统
  我想要采集用户输入
  以便生成控制结果

  Background:
    Given ControlX 应用已启动
    And 布局已加载
    And 控制功能已启用

  Scenario: 触控输入采集
    Given 触控输入源可用
    And 布局包含触控映射
    When 用户触摸屏幕
    Then 系统感知触控位置
    And 连续输入可被持续感知
    And 触控位置映射到控制结果
    And 输入采集不依赖 UI 是否可见

  Scenario: 陀螺仪输入采集
    Given 陀螺仪输入源可用
    And 布局包含陀螺仪映射
    When 用户倾斜设备
    Then 系统感知陀螺仪数据
    And 连续输入可被持续感知
    And 陀螺仪数据映射到控制结果
    And 输入采集不依赖 UI 是否可见

  Scenario: 键盘输入采集（可选）
    Given 键盘输入源可用
    And 布局包含键盘映射
    And 键盘输入支持已启用
    When 用户按下键盘按键
    Then 系统感知按键状态
    And 连续输入可被持续感知
    And 按键状态映射到控制结果
    And 输入采集不依赖 UI 是否可见

  Scenario: 手柄输入采集（可选）
    Given 手柄输入源可用
    And 布局包含手柄映射
    And 手柄输入支持已启用
    When 用户操作手柄
    Then 系统感知手柄状态
    And 连续输入可被持续感知
    And 手柄状态映射到控制结果
    And 输入采集不依赖 UI 是否可见

  Scenario: 多输入源同时存在
    Given 触控输入源可用
    And 陀螺仪输入源可用
    And 键盘输入源可用
    And 手柄输入源可用
    When 用户同时使用多种输入源
    Then 多输入源可同时存在
    And 各输入源独立采集
    And 各输入源映射独立
    And 控制结果组合生成

  Scenario: 输入采集不依赖 UI 可见性
    Given 控制功能已启用
    And 布局已加载
    And UI 不可见（后台运行）
    When 用户输入
    Then 输入可被持续感知
    And 控制结果正常生成
    And 控制结果正常发送
    And UI 可见性不影响输入采集

  Scenario: 输入刷新频率
    Given 控制功能已启用
    And 用户输入持续
    When 输入采集运行
    Then 输入刷新能力 ≥125Hz
    And 输入采集连续
    And 输入采集无延迟
    And 输入采集精确