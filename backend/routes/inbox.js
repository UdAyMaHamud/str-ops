const express = require('express')
const { getThreads, getDrafts, createDraft, reviewDraft } = require('../controllers/inboxController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/threads', getThreads)
route.get('/drafts', getDrafts)
route.post('/drafts', createDraft)

// ====== Senior Routes
route.patch('/drafts/:id/review', roleCheck('senior', 'admin'), reviewDraft)

module.exports = route
