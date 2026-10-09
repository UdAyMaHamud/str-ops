const express = require('express')
const { getTraining, getEods, createEod, reviewEod, getTeam } = require('../controllers/trainingController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/progress', getTraining)
route.get('/eod', getEods)

// ====== Trainee Routes
route.post('/eod', roleCheck('trainee'), createEod)

// ====== Trainer Routes
route.get('/team', roleCheck('senior', 'admin'), getTeam)
route.patch('/eod/:id/review', roleCheck('senior', 'admin'), reviewEod)

module.exports = route
