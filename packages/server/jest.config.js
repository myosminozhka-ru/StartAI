module.exports = {
    // Use ts-jest preset for testing TypeScript files with Jest
    preset: 'ts-jest',
    // Set the test environment to Node.js
    testEnvironment: 'node',

    // Define the root directory for tests and modules
    roots: ['<rootDir>/test'],

    // Use ts-jest to transform TypeScript files
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },

    // Regular expression to find test files
    testRegex: '((\\.|/).*\\.test)\\.tsx?$',

    // File extensions to recognize in module resolution
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Display individual test results with the test suite hierarchy.
    verbose: true,

    // TypeScript configuration for tests
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
                    strictNullChecks: false
                }
            },
            // Игнорируем TypeScript ошибки в тестах
            isolatedModules: true,
            diagnostics: false
        }
    },

    // Настройки для стабильности
    testTimeout: 30000,
    maxWorkers: 1,
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
}
