const express = require('express')
const { getAlerts, updateAlert } = require('../controllers/alertController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getAlerts)

// ====== Senior Routes
route.patch('/:id', roleCheck('senior', 'admin'), updateAlert)

module.exports = route
