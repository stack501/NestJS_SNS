import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  preset: 'ts-jest',
  
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  
  modulePaths: ['<rootDir>'],
  
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
};

export default config;