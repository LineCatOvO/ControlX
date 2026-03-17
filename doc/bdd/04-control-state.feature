Feature: 控制状态管理
  As a 赛车游戏玩家
  I want to 管理控制状态和查看控制输出
  So that 我可以确认控制行为正确并了解系统状态

  Background: 控制服务已启动
    Given 应用已启动
    And 服务状态为"已启动"
    And WebSocket连接已建立
    And 已加载有效的操作布局

  Scenario: 启用控制输出
    Given 服务状态为"已启动"
    And 控制处于禁用状态
    When 用户点击"启用控制"按钮
    Then 控制应变为启用状态
    And 用户输入应被转换为控制输出
    And 控制输出应发送到后端

  Scenario: 禁用控制输出
    Given 控制处于启用状态
    And 用户正在进行输入操作
    When 用户点击"禁用控制"按钮
    Then 控制应变为禁用状态
    And 系统应立即停止发送控制输出
    And 后端应收到状态清零指令
    And 布局和连接状态应保持不变

  Scenario: 禁用后重新启用
    Given 控制处于禁用状态
    When 用户点击"启用控制"按钮
    Then 控制应变为启用状态
    And 用户输入应再次被转换为控制输出
    And 不应存在残留的控制状态

  Scenario: 查看当前控制状态
    Given 控制处于启用状态
    When 用户查看控制状态界面
    Then 系统应显示当前是否正在产生控制输出
    And 系统应显示当前按下的按键
    And 系统应显示当前摇杆位置
    And 系统应显示当前扳机值

  Scenario: 键盘控制结果输出
    Given 控制处于启用状态
    And 当前布局包含键盘按键映射
    When 用户触控按键区域
    Then 系统应生成键盘控制结果
    And 控制结果应包含正确的键码
    And 控制结果应通过WebSocket发送

  Scenario: 多键同时输出
    Given 控制处于启用状态
    And 当前布局支持多键映射
    When 用户同时触控多个按键区域
    Then 系统应生成包含多个键码的控制结果
    And 所有按下的键应同时生效
    And 控制结果应正确反映多键状态

  Scenario: 手柄控制结果输出
    Given 控制处于启用状态
    And 当前布局包含手柄按键映射
    When 用户触控手柄按键区域
    Then 系统应生成手柄控制结果
    And 控制结果应包含正确的按键状态
    And 控制结果应通过WebSocket发送

  Scenario: 摇杆模拟量输出
    Given 控制处于启用状态
    And 当前布局包含摇杆元素
    When 用户拖动摇杆到中间位置
    Then 系统应生成摇杆轴值
    And 轴值应为连续的模拟量
    And 轴值范围应在-1到1之间

  Scenario: 扳机模拟量输出
    Given 控制处于启用状态
    And 当前布局包含扳机元素
    When 用户按压扳机区域
    Then 系统应生成扳机值
    And 扳机值应为连续的模拟量
    And 扳机值范围应在0到1之间

  Scenario: 键盘与手柄混合输出
    Given 控制处于启用状态
    And 当前布局同时包含键盘和手柄映射
    When 用户同时操作键盘和手柄元素
    Then 系统应同时生成键盘和手柄控制结果
    And 两种控制结果应互不影响
    And 控制输出应正确组合发送

  Scenario: 控制状态发送模式
    Given 控制处于启用状态
    And 状态发送模式已启用
    When 用户持续进行输入操作
    Then 系统应按固定节奏发送完整状态
    And 发送频率应符合配置
    And 每次发送应包含完整的控制状态

  Scenario: 控制事件发送模式
    Given 控制处于启用状态
    And 事件发送模式已启用
    When 用户改变输入状态
    Then 系统应在状态变化时发送控制数据
    And 状态未变化时不应发送冗余数据

  Scenario: 延迟检测正常
    Given 控制处于启用状态
    And 后端响应正常
    When 系统发送控制数据并收到ACK
    Then 系统应计算延迟
    And 延迟小于等于50ms时应显示正常状态
    And 系统应显示当前延迟值

  Scenario: 延迟检测警告
    Given 控制处于启用状态
    And 后端响应延迟较高
    When 系统检测到延迟大于50ms
    Then 系统应显示黄色警告
    And 系统应提示延迟较高
    And 控制行为不应自动改变

  Scenario: 延迟检测严重警告
    Given 控制处于启用状态
    And 后端响应延迟很高
    When 系统检测到延迟大于100ms
    Then 系统应显示红色严重警告
    And 系统应提示延迟过高
    And 控制行为不应自动改变

  Scenario: ACK确认机制
    Given 控制处于启用状态
    When 系统发送控制数据
    Then 系统应等待后端ACK确认
    And 收到ACK后应确认控制结果已执行
    And 未收到ACK时应标记为未确认

  Scenario: 控制作用范围全局
    Given 控制处于启用状态
    And 后端运行正常
    When 用户进行输入操作
    Then 控制结果应对宿主环境全局生效
    And 控制不应基于当前应用筛选作用范围

  Scenario: 安全机制介入
    Given 控制处于启用状态
    And 后端检测到UAC或高权限内容
    When 安全机制触发
    Then 后端应立即进入零输出状态
    And 客户端应收到中断反馈
    And 用户应能感知到控制被中断

  Scenario: 控制状态清零
    Given 控制处于启用状态
    And 存在活跃的控制输出
    When 用户禁用控制或服务停止
    Then 所有键盘按键应被释放
    And 所有手柄状态应归零
    And 后端应收到清零指令
    And 最终状态应等价于无控制输出

  Scenario: 控制刷新频率
    Given 控制处于启用状态
    And 用户持续进行输入操作
    When 系统运行正常
    Then 控制状态更新频率应不低于125Hz
    And 更新应稳定连续
    And 不应出现明显的卡顿

  Scenario: 控制状态持久化
    Given 用户设置了特定的控制参数
    When 用户退出应用
    And 用户重新启动应用
    Then 控制参数应被保留
    And 用户无需重新配置

  Scenario: 控制状态可见性
    Given 控制处于启用状态
    When 用户查看状态界面
    Then 系统应显示控制是否启用
    And 系统应显示是否存在持续控制
    And 系统应显示当前布局名称
    And 系统应显示连接状态