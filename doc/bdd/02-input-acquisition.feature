Feature: 输入源采集
  As a 赛车游戏玩家
  I want to 通过触控和陀螺仪输入控制指令
  So that 我可以操控赛车游戏

  Background: 控制服务已启动
    Given 应用已启动
    And 服务状态为"已启动"
    And WebSocket连接已建立
    And 已加载有效的操作布局

  Scenario: 单点触控输入
    Given 用户在触控区域内
    When 用户在屏幕上按下手指
    Then 系统应采集触控坐标
    And 系统应采集触控压力值
    And 系统应生成对应的Operation
    And Operation应被发送到后端

  Scenario: 单点触控释放
    Given 用户正在触控屏幕
    When 用户抬起手指
    Then 系统应检测到触控结束
    And 系统应更新Operation状态
    And 更新后的Operation应被发送

  Scenario: 单点触控移动
    Given 用户正在触控屏幕
    When 用户移动手指到新位置
    Then 系统应持续采集新的坐标
    And 系统应以不低于125Hz的频率更新状态
    And 每次更新都应发送到后端

  Scenario: 多点触控输入
    Given 用户在触控区域内
    When 用户同时按下两个手指
    Then 系统应同时采集两个触控点
    And 系统应正确区分两个触控点
    And 系统应生成包含多点信息的Operation

  Scenario: 多点触控独立操作
    Given 用户正在使用两个手指触控
    When 用户移动其中一个手指
    Then 系统应正确更新该手指的位置
    And 另一个手指的位置应保持不变
    And 系统应正确处理多点触控的独立操作

  Scenario: 快速触控连击
    Given 用户在触控区域内
    When 用户快速连续点击同一位置10次
    Then 系统应采集所有触控事件
    And 系统应正确处理每个按下和抬起事件
    And 不应丢失任何触控事件

  Scenario: 长按触控
    Given 用户在触控区域内
    When 用户按住屏幕2秒不释放
    Then 系统应持续采集触控状态
    And 系统应持续发送控制状态
    And 控制状态应保持稳定

  Scenario: 触控区域边界
    Given 用户在触控区域边缘
    When 用户触控位置刚好在区域边界
    Then 系统应正确判断触控是否在区域内
    And 边界判断应一致且可预测

  Scenario: 触控区域外输入
    Given 用户在触控区域外
    When 用户在区域外触控
    Then 系统应忽略该触控输入
    And 不应生成控制输出

  Scenario: 陀螺仪输入采集
    Given 设备支持陀螺仪传感器
    And 陀螺仪输入已启用
    When 用户旋转设备
    Then 系统应采集陀螺仪数据
    And 系统应将陀螺仪数据转换为控制语义
    And 控制语义应被发送到后端

  Scenario: 陀螺仪持续输入
    Given 用户正在旋转设备
    When 用户持续改变设备方向
    Then 系统应持续采集陀螺仪数据
    And 系统应以不低于125Hz的频率更新状态
    And 控制输出应平滑变化

  Scenario: 陀螺仪死区处理
    Given 陀螺仪死区设置为0.1
    When 用户轻微晃动设备（幅度小于死区）
    Then 系统应忽略小幅抖动
    And 不应产生控制输出变化

  Scenario: 陀螺仪非线性映射
    Given 陀螺仪映射设置为指数曲线
    When 用户旋转设备到中间角度
    Then 系统应应用非线性映射
    And 控制输出应符合指数曲线特性

  Scenario: 触控与陀螺仪同时输入
    Given 触控和陀螺仪都已启用
    When 用户同时进行触控操作和旋转设备
    Then 系统应同时采集两种输入
    And 两种输入应独立处理
    And 最终控制输出应正确组合

  Scenario: 输入采集不依赖UI可见性
    Given 服务状态为"已启动"
    And 应用在后台运行
    When 用户在悬浮窗上进行触控操作
    Then 系统应正常采集输入
    And 控制输出应正常发送

  Scenario: 输入平滑处理
    Given 输入平滑功能已启用
    When 用户进行不连续的输入操作
    Then 系统应平滑处理输入变化
    And 控制输出应平滑过渡
    And 不应出现突变

  Scenario: 输入延迟测量
    Given 用户进行触控输入
    When 系统采集并发送输入
    Then 系统应记录输入时间戳
    And 系统应等待后端ACK确认
    And 系统应计算并显示延迟

  Scenario: 高频输入处理
    Given 用户进行高频输入操作
    When 输入频率达到100次/秒
    Then 系统应正确处理所有输入
    And 不应丢失输入事件
    And 系统应保持稳定运行

  Scenario: 输入状态重置
    Given 用户正在进行输入操作
    When 用户停止所有输入
    Then 系统应在短时间内检测到输入停止
    And 系统应发送零状态控制输出
    And 后端应收到状态清零指令