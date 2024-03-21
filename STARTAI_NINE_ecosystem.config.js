module.exports = {
    apps: [
        {
            name: 'STARTAI_NINE',
            script: './node_modules/pnpm/bin/pnpm.cjs',
            args: 'start',
            watch: false,
            env: {
                NODE_ENV: 'STARTAI_NINE',
                PORT: 3030
            }
        }
    ]
}
