const express = require('express')
const { getScreenings, updateScreening } = require('../controllers/screeningController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getScreenings)

// ====== Senior Routes
route.patch('/:id', roleCheck('senior', 'admin'), updateScreening)

module.exports = route
