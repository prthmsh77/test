module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: '../coverage/api',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@shikhar/shared': '<rootDir>/../../packages/shared/src',
  },
};
