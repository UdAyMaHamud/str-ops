const express = require('express')
const { getIntegrations, getWorkflowRuns } = require('../controllers/integrationController')

const route = express.Router()

route.get('/all', getIntegrations)
route.get('/workflows', getWorkflowRuns)

module.exports = route
