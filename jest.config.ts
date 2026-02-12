import type {Config} from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  
  // Add these configurations
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Map path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/analyzers/(.*)$': '<rootDir>/lib/analyzers/$1',
    '^@/types$': '<rootDir>/types/index.ts',
  },
  
  // Transform settings
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.?(m)[jt]s?(x)',
    '**/?(*.)+(spec|test).?(m)[jt]s?(x)'
  ],
  
  // Ignore these paths
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/dist/'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;