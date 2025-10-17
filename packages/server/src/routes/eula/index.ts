import express from 'express'
import eulaController from '../../controllers/eula'

const router = express.Router()

// GET /soglashenie - отдает PDF файл EULA
router.get('/soglashenie', eulaController.getEulaPdf)

export default router
