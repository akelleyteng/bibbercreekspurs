/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.{ts,tsx}', '**/?(*.)+(spec|test).{ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@4hclub/shared$': '<rootDir>/../shared/src/index.ts',
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  verbose: true,
  testTimeout: 10000,
};
