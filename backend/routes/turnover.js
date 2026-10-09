const express = require('express')
const { getTurnovers, updateTurnoverQc } = require('../controllers/turnoverController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getTurnovers)

// ====== Senior Routes
route.patch('/:id/qc', roleCheck('senior', 'admin'), updateTurnoverQc)

module.exports = route
