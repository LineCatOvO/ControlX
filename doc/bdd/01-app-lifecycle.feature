Feature: 应用生命周期管理
  As a 赛车游戏玩家
  I want to 启动和管理控制应用
  So that 我可以开始使用远程控制功能

  Background: 应用已安装
    Given 应用已安装在Android设备上
    And 设备系统版本不低于Android 9
    And 设备具有触控屏幕

  Scenario: 首次启动应用
    Given 用户首次打开应用
    When 用户点击应用图标启动应用
    Then 应用应显示主界面
    And 应用应请求必要的系统权限
    And 应用应显示服务状态为"未启动"
    And 应用应显示当前布局信息

  Scenario: 启动控制服务
    Given 应用已启动并显示主界面
    And 服务状态为"未启动"
    When 用户点击"启动服务"按钮
    Then 服务状态应变为"已启动"
    And 应用应显示悬浮窗权限请求（如未授权）
    And 应用应开始监听用户输入
    And 应用应尝试建立WebSocket连接

  Scenario: 停止控制服务
    Given 服务状态为"已启动"
    When 用户点击"停止服务"按钮
    Then 服务状态应变为"已停止"
    And 应用应停止监听用户输入
    And 应用应断开WebSocket连接
    And 所有控制输出应被清零

  Scenario: 应用切换到后台
    Given 服务状态为"已启动"
    And 用户正在使用控制功能
    When 用户按下Home键或切换到其他应用
    Then 应用应继续在后台运行
    And 控制服务应保持运行状态
    And 悬浮窗应保持显示（如已授权）
    And 用户输入应继续被采集和处理

  Scenario: 应用从后台恢复
    Given 应用在后台运行
    And 控制服务处于"已启动"状态
    When 用户切换回应用
    Then 应用应恢复到主界面
    And 服务状态应正确显示当前状态
    And 连接状态应正确显示
    And 当前布局信息应正确显示

  Scenario: 应用退出
    Given 服务状态为"已启动"
    When 用户退出应用
    Then 应用应停止控制服务
    And 所有控制输出应被清零
    And WebSocket连接应被断开
    And 悬浮窗应被移除

  Scenario: 应用异常退出后重启
    Given 应用因异常而退出
    And 之前控制服务处于"已启动"状态
    When 用户重新启动应用
    Then 应用应正常启动
    And 服务状态应显示为"未启动"
    And 不应存在残留的控制输出
    And 之前的布局配置应被保留

  Scenario: 设备重启后启动应用
    Given 设备刚刚重启完成
    When 用户启动应用
    Then 应用应正常启动
    And 服务状态应显示为"未启动"
    And 之前的布局配置应被保留
    And 应用不应自动启动控制服务

  Scenario: 检查应用权限状态
    Given 应用已启动
    When 用户查看权限设置
    Then 应用应显示悬浮窗权限状态
    And 应用应显示存储权限状态（如需要）
    And 应用应提供跳转到系统权限设置的入口

  Scenario: 权限被撤销后恢复
    Given 服务状态为"已启动"
    And 悬浮窗权限已授予
    When 用户在系统设置中撤销悬浮窗权限
    Then 应用应检测到权限变更
    And 应用应显示权限缺失提示
    And 悬浮窗应被移除
    And 控制服务应继续运行（但无悬浮窗）

  Scenario: 低内存情况下运行
    Given 设备内存不足
    And 服务状态为"已启动"
    When 系统尝试回收内存
    Then 应用应优先保持控制服务运行
    And 非必要的后台任务应被暂停
    And 控制输出应保持稳定