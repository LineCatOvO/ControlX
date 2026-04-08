Feature: 布局管理
  作为 ControlX 用户
  我想要管理操作布局
  以便自定义控制界面

  Background:
    Given ControlX 应用已启动
    And WebSocket 连接已建立

  Scenario: 创建布局
    Given ControlX 应用已启动
    When 用户创建新布局
    Then 新布局被创建
    And 布局可创建
    And 布局可修改
    And 布局可分享
    And 布局可下载
    And 布局可复用

  Scenario: 修改布局
    Given 布局已存在
    And 布局已加载
    When 用户修改已有布局
    Then 布局内容被更新
    And 编辑失败不破坏已有布局
    And 布局修改可保存
    And 布局修改可撤销

  Scenario: 删除布局
    Given 多个布局已存在
    When 用户删除布局
    Then 布局被移除
    And 删除不影响其他布局
    And 其他布局保持可用
    And 布局列表更新

  Scenario: 切换布局
    Given 多个布局已存在
    And 当前布局已加载
    When 用户切换布局
    Then 新布局立即生效
    And 不产生残留控制状态
    And 控制结果基于新布局生成
    And 布局切换不影响连接状态

  Scenario: 导入布局
    Given 外部布局文件可用
    When 用户导入外部布局
    Then 外部布局被加载
    And 导入失败不影响现有布局
    And 导入布局可编辑
    And 导入布局可使用

  Scenario: 导出布局
    Given 布局已存在
    And 布局已加载
    When 用户导出布局
    Then 布局被导出为可分享资源
    And 导出格式用户可见
    And 导出布局可导入其他设备
    And 导出布局包含完整配置

  Scenario: 多布局同时存在
    Given ControlX 应用已启动
    When 用户创建多个布局
    Then 多布局同时存在
    And 布局列表显示所有布局
    And 用户可切换任意布局
    And 布局启用/禁用不影响连接状态

  Scenario: 布局切换即时生效
    Given 多个布局已存在
    And 当前布局已加载
    And 控制功能已启用
    When 用户切换布局
    Then 新布局立即生效
    And 控制结果立即基于新布局生成
    And 不存在残留控制状态
    And 布局切换无延迟

  Scenario: 布局启用/禁用不影响连接状态
    Given WebSocket 连接已建立
    And 布局已加载
    When 用户切换布局
    Then WebSocket 连接保持
    And 连接状态不受影响
    And 控制结果继续发送