import { Request, Response, NextFunction } from 'express'
import nodeConfigsService from '../../services/node-configs'
import { InternalOsmiError } from '../../errors/InternalOsmiError'
import { StatusCodes } from 'http-status-codes'

const getAllNodeConfigs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalOsmiError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: nodeConfigsController.getAllNodeConfigs - body not provided!`
            )
        }
        const apiResponse = await nodeConfigsService.getAllNodeConfigs(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    getAllNodeConfigs
}
