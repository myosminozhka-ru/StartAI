module.exports = {
    // Проекты для разных пакетов
    projects: [
        {
            displayName: 'OSMI AI Components',
            testMatch: [
                '<rootDir>/packages/osmi-ai-components/src/**/*.test.js',
                '<rootDir>/packages/osmi-ai-components/nodes/**/*.test.js'
            ],
            preset: 'ts-jest',
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/packages/osmi-ai-components/jest.setup.js'],
            collectCoverageFrom: [
                'packages/osmi-ai-components/src/**/*.{js,ts}',
                'packages/osmi-ai-components/nodes/**/*.{js,ts}',
                '!packages/osmi-ai-components/src/**/*.d.ts',
                '!packages/osmi-ai-components/src/**/*.test.{js,ts}',
                '!packages/osmi-ai-components/nodes/**/*.test.{js,ts}'
            ],
            coverageDirectory: '<rootDir>/packages/osmi-ai-components/coverage',
            coverageReporters: ['text', 'lcov', 'html', 'json'],
            testTimeout: 30000,
            transform: {
                '^.+\\.tsx?$': 'ts-jest'
            },
            globals: {
                'ts-jest': {
                    tsconfig: {
                        compilerOptions: {
                            module: 'commonjs',
                            target: 'es2020',
                            lib: ['es2020'],
                            skipLibCheck: true,
                            strict: false,
                            esModuleInterop: true
                        }
                    }
                }
            },
            coverageThreshold: {
                global: {
                    branches: 50,
                    functions: 60,
                    lines: 60,
                    statements: 60
                }
            }
        },
        {
            displayName: 'OSMI AI Server',
            testMatch: [
                '<rootDir>/packages/server/test/**/*.test.js',
                '<rootDir>/packages/server/test/utils/simple.test.ts'
            ],
            preset: 'ts-jest',
            testEnvironment: 'node',
            setupFilesAfterEnv: ['<rootDir>/packages/server/jest.setup.js'],
            collectCoverageFrom: [
                'packages/server/src/**/*.{js,ts}',
                '!packages/server/src/**/*.d.ts',
                '!packages/server/src/**/*.test.{js,ts}'
            ],
            coverageDirectory: '<rootDir>/packages/server/coverage',
            coverageReporters: ['text', 'lcov', 'html', 'json'],
            testTimeout: 30000,
            maxWorkers: 1, // Для стабильности API тестов
            transform: {
                '^.+\\.tsx?$': 'ts-jest'
            },
            globals: {
                'ts-jest': {
                    tsconfig: {
                        compilerOptions: {
                            module: 'commonjs',
                            target: 'es2020',
                            lib: ['es2020'],
                            skipLibCheck: true,
                            strict: false,
                            noImplicitAny: false,
                            strictNullChecks: false,
                            esModuleInterop: true
                        }
                    },
                    isolatedModules: true,
                    diagnostics: false
                }
            },
            coverageThreshold: {
                global: {
                    branches: 40,
                    functions: 50,
                    lines: 50,
                    statements: 50
                }
            }
        }
    ],

    // Глобальные настройки
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text-summary', 'lcov', 'html'],

    // Игнорируемые пути
    testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/cypress/'],

    // Настройки для CI
    ci: true,
    reporters: ['default'],

    // Глобальные моки
    moduleNameMapper: {
        '^osmi-ai-embed-react$': '<rootDir>/__mocks__/osmi-ai-embed-react.js'
    },

    // Настройки производительности
    maxConcurrency: 5,
    verbose: true,

    // Настройки трансформации для современного Jest
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

    // Расширения файлов
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // Настройки для Node.js 22
    extensionsToTreatAsEsm: ['.ts'],
    testEnvironment: 'node',

    // Дополнительные настройки для совместимости
    setupFiles: ['<rootDir>/jest.setup.js']
}
