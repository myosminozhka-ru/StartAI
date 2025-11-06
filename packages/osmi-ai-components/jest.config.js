module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/nodes'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    compilerOptions: {
                        module: 'commonjs',
                        target: 'es2020',
                        lib: ['es2020'],
                        skipLibCheck: true,
                        strict: false
                    }
                }
            }
        ]
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    verbose: true,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    collectCoverageFrom: [
        'src/**/*.{js,ts}',
        'nodes/**/*.{js,ts}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{js,ts}',
        '!nodes/**/*.test.{js,ts}'
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testTimeout: 30000,
    moduleNameMapper: {
        '^../../../src/(.*)$': '<rootDir>/src/$1'
    }
}
