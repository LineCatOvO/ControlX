module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\.ts?$': 'ts-jest'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 15000,
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  // 移除被忽略的测试文件，让它们在Linux环境下运行
  // 这些测试需要WebSocket服务器，在Linux环境下可以正常运行
  testPathIgnorePatterns: []
};
