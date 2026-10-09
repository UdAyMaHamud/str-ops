const express = require('express')
const { getContacts, getEscalations, createEscalation, resolveEscalation } = require('../controllers/escalationController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/contacts', getContacts)
route.get('/all', getEscalations)
route.post('/create', createEscalation)

// ====== Senior Routes
route.patch('/:id/resolve', roleCheck('senior', 'admin'), resolveEscalation)

module.exports = route
