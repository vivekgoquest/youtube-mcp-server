export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // Ensure proper cleanup between tests
  },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        moduleResolution: 'NodeNext',
        module: 'NodeNext',
        target: 'ES2022',
        isolatedModules: true
      }
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  testTimeout: 20000, // Increased for comprehensive individual tool testing support
  verbose: true,
  // DEBUG mode support - extended timeout and verbose output
  ...(process.env.DEBUG === 'true' ? { testTimeout: 60000, verbose: true } : {}),
  // Conditional sequential execution for API tests - omit if not forcing sequential
  ...(process.env.FORCE_SEQUENTIAL === 'true' ? { maxWorkers: 1 } : {}),
  // Test categorization support
  testPathIgnorePatterns: [
    '/node_modules/',
    process.env.SKIP_EXPENSIVE_TESTS === 'true' ? 'interface-compliance' : ''
  ].filter(Boolean)
};
