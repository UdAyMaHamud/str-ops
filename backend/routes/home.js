const express = require('express')
const { getOwnerHome, getTraineeHome, getSeniorHome, getAdminHome } = require('../controllers/homeController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

// ====== One home per role
route.get('/owner', roleCheck('client'), getOwnerHome)
route.get('/trainee', roleCheck('trainee'), getTraineeHome)
route.get('/senior', roleCheck('senior', 'admin'), getSeniorHome)
route.get('/admin', roleCheck('admin'), getAdminHome)

module.exports = route
