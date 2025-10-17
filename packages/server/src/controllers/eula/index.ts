import { NextFunction, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'

const getEulaPdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Попробуем несколько возможных путей к PDF файлу EULA
        const possiblePaths = [
            path.join(__dirname, '../../../ui/public/eula.pdf'),
            path.join(__dirname, '../../../../ui/public/eula.pdf'),
            path.join(__dirname, '../../../../../packages/ui/public/eula.pdf'),
            path.join(process.cwd(), 'packages/ui/public/eula.pdf')
        ]

        let eulaPath = null
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                eulaPath = testPath
                break
            }
        }

        if (!eulaPath) {
            return res.status(404).json({ error: 'EULA PDF not found' })
        }

        // Устанавливаем правильные заголовки для PDF
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename="eula.pdf"')

        return res.sendFile(eulaPath)
    } catch (error) {
        next(error)
    }
}

export default {
    getEulaPdf
}
