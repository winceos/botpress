import * as sdk from 'botpress/sdk'
import { Request, Response } from 'express'
import { validate } from 'joi'
import _ from 'lodash'
import moment from 'moment'
import multer from 'multer'
import nanoid from 'nanoid'

import { QnaEntry } from './qna'
import Storage from './storage'
import { importQuestions, prepareExport, prepareImport } from './transfer'
import { QnaDefSchema } from './validation'

export default async (bp: typeof sdk, botScopedStorage: Map<string, Storage>) => {
  const jsonUploadStatuses = {}
  const router = bp.http.createRouterForBot('qna')

  router.get('/questions', async (req: Request, res: Response) => {
    try {
      const {
        query: { question = '', categories = [], limit, offset }
      } = req

      const storage = botScopedStorage.get(req.params.botId)
      const items = await storage.getQuestions({ question, categories }, { limit, offset })
      res.send({ ...items })
    } catch (e) {
      bp.logger.attachError(e).error('Error listing questions')
      res.status(500).send(e.message || 'Error')
    }
  })

  router.post('/questions', async (req: Request, res: Response, next: Function) => {
    try {
      const qnaEntry = (await validate(req.body, QnaDefSchema)) as QnaEntry
      const storage = botScopedStorage.get(req.params.botId)
      const id = await storage.insert(qnaEntry)
      res.send(id)
    } catch (e) {
      next(new Error(e.message))
    }
  })

  router.get('/questions/:id', async (req: Request, res: Response) => {
    try {
      const storage = botScopedStorage.get(req.params.botId)
      const question = await storage.getQnaItem(req.params.id)
      res.send(question)
    } catch (e) {
      sendToastError('Fetch', e.message)
    }
  })

  router.post('/questions/:id', async (req: Request, res: Response, next: Function) => {
    const {
      query: { limit, offset, question, categories }
    } = req

    try {
      const qnaEntry = (await validate(req.body, QnaDefSchema)) as QnaEntry
      const storage = botScopedStorage.get(req.params.botId)
      await storage.update(qnaEntry, req.params.id)

      const questions = await storage.getQuestions({ question, categories }, { limit, offset })
      res.send(questions)
    } catch (e) {
      next(new Error(e.message))
    }
  })

  router.post('/questions/:id/delete', async (req: Request, res: Response) => {
    const {
      query: { limit, offset, question, categories }
    } = req

    try {
      const storage = botScopedStorage.get(req.params.botId)
      await storage.delete(req.params.id)
      const questionsData = await storage.getQuestions({ question, categories }, { limit, offset })
      res.send(questionsData)
    } catch (e) {
      bp.logger.attachError(e).error(`Could not delete QnA #${req.params.id}`)
      res.status(500).send(e.message || 'Error')
      sendToastError('Delete', e.message)
    }
  })

  router.get('/categories', async (req: Request, res: Response) => {
    const storage = botScopedStorage.get(req.params.botId)
    const categories = await storage.getCategories()
    res.send({ categories })
  })

  router.get('/export', async (req: Request, res: Response) => {
    const storage = botScopedStorage.get(req.params.botId)
    const data: string = await prepareExport(storage, bp)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-disposition', `attachment; filename=qna_${moment().format('DD-MM-YYYY')}.json`)
    res.end(data)
  })

  router.get('/contentElementUsage', async (req: Request, res: Response) => {
    const storage = botScopedStorage.get(req.params.botId)
    const usage = await storage.getContentElementUsage()
    res.send(usage)
  })

  const upload = multer()
  router.post('/analyzeImport', upload.single('file'), async (req: any, res: Response) => {
    const storage = botScopedStorage.get(req.params.botId)
    const cmsIds = await storage.getAllContentElementIds()
    const importData = await prepareImport(JSON.parse(req.file.buffer))

    res.send({
      qnaCount: await storage.count(),
      cmsCount: (cmsIds && cmsIds.length) || 0,
      fileQnaCount: (importData.questions && importData.questions.length) || 0,
      fileCmsCount: (importData.content && importData.content.length) || 0
    })
  })

  router.post('/import', upload.single('file'), async (req: any, res: Response) => {
    const uploadStatusId = nanoid()
    res.send(uploadStatusId)

    const storage = botScopedStorage.get(req.params.botId)

    if (req.body.action === 'clear_insert') {
      updateUploadStatus(uploadStatusId, 'Deleting existing questions')
      const questions = await storage.fetchQNAs()

      await storage.delete(questions.map(({ id }) => id))
      updateUploadStatus(uploadStatusId, 'Deleted existing questions')
    }

    try {
      const importData = await prepareImport(JSON.parse(req.file.buffer))

      await importQuestions(importData, storage, bp, updateUploadStatus, uploadStatusId)
      updateUploadStatus(uploadStatusId, 'Completed')
    } catch (e) {
      bp.logger.attachError(e).error('JSON Import Failure')
      updateUploadStatus(uploadStatusId, `Error: ${e.message}`)
    }
  })

  router.get('/json-upload-status/:uploadStatusId', async (req: Request, res: Response) => {
    res.end(jsonUploadStatuses[req.params.uploadStatusId])
  })

  const sendToastError = (action: string, error: string) => {
    bp.realtime.sendPayload(
      bp.RealTimePayload.forAdmins('toast.qna-save', { text: `QnA ${action} Error: ${error}`, type: 'error' })
    )
  }

  const updateUploadStatus = (uploadStatusId: string, status: string) => {
    if (uploadStatusId) {
      jsonUploadStatuses[uploadStatusId] = status
    }
  }
}
