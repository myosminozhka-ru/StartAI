import { dest, src, series } from 'gulp'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

function copyEmailTemplates() {
    return src(['src/enterprise/emails/*.hbs']).pipe(dest('dist/enterprise/emails'))
}

async function compileTypeScript() {
    try {
        await execAsync('tsc')
        console.log('TypeScript compilation completed')
    } catch (error) {
        console.error('TypeScript compilation failed:', error)
        throw error
    }
}

exports.default = series(compileTypeScript, copyEmailTemplates)
