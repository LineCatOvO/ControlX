/**
 * Mocha 配置文件
 */

module.exports = {
  // 超时时间
  timeout: 60000,
  
  // 慢测试阈值
  slow: 10000,
  
  // 重试次数
  retries: 1,
  
  // 报告器
  reporter: 'spec',
  
  // 递归查找测试文件
  recursive: true,
  
  // 测试文件匹配模式
  spec: [
    'tests/functional/**/*.test.js',
    'tests/protocol/**/*.test.js',
    'tests/performance/**/*.test.js'
  ],
  
  // 颜色输出
  color: true,
  
  // 退出
  exit: true
};
