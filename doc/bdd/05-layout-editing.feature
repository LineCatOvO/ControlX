Feature: 布局编辑
  作为 ControlX 用户
  我想要编辑布局内容
  以便自定义控制映射和参数

  Background:
    Given ControlX 应用已启动
    And 布局已加载

  Scenario: 添加操作元素
    Given 布局编辑模式已启用
    And 布局已加载
    When 用户添加操作元素
    Then 新元素被添加到布局
    And 元素位置可配置
    And 元素类型可选择
    And 编辑不中断当前控制

  Scenario: 删除操作元素
    Given 布局编辑模式已启用
    And 布局包含多个操作元素
    When 用户删除操作元素
    Then 元素被移除
    And 布局更新
    And 编辑失败不污染已发布布局
    And 其他元素保持不变

  Scenario: 调整元素位置
    Given 布局编辑模式已启用
    And 布局包含操作元素
    When 用户移动元素
    Then 元素位置被更新
    And 支持撤销或等价恢复
    And 编辑过程中可观察控制变化
    And 位置调整不影响控制映射

  Scenario: 调整元素尺寸
    Given 布局编辑模式已启用
    And 布局包含操作元素
    When 用户缩放元素
    Then 元素尺寸被更新
    And 支持撤销或等价恢复
    And 编辑过程中可观察控制变化
    And 尺寸调整不影响控制映射

  Scenario: 编辑控制映射
    Given 布局编辑模式已启用
    And 布局包含操作元素
    When 用户修改映射关系
    Then 映射关系被更新
    And 编辑结果可即时生效或预览
    And 映射类型可选择（键盘/手柄）
    And 映射参数可配置

  Scenario: 调整灵敏度参数
    Given 布局编辑模式已启用
    And 布局包含操作元素
    And 元素包含灵敏度参数
    When 用户调整灵敏度
    Then 灵敏度参数被更新
    And 用户可随时放弃未保存修改
    And 灵敏度影响控制结果强度

  Scenario: 调整范围参数
    Given 布局编辑模式已启用
    And 布局包含操作元素
    And 元素包含范围参数
    When 用户调整范围
    Then 范围参数被更新
    And 用户可随时放弃未保存修改
    And 范围影响控制结果边界

  Scenario: 调整曲线参数
    Given 布局编辑模式已启用
    And 布局包含操作元素
    And 元素包含曲线参数
    When 用户调整曲线
    Then 曲线参数被更新
    And 用户可随时放弃未保存修改
    And 曲线影响控制结果非线性映射

  Scenario: 实时预览编辑结果
    Given 布局编辑模式已启用
    And 布局包含操作元素
    When 用户预览编辑结果
    Then 控制行为变化可见
    And 预览不影响运行态
    And 预览结果可放弃
    And 预览结果可保存

  Scenario: 编辑失败不污染已发布布局
    Given 布局编辑模式已启用
    And 布局已发布
    When 编辑操作失败
    Then 已发布布局保持不变
    And 失败原因提示用户
    And 用户可重新尝试编辑
    And 不存在残留编辑状态