const express = require('express')
const { getTickets, updateTicket } = require('../controllers/ticketController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getTickets)

// ====== Senior Routes
route.patch('/:id', roleCheck('senior', 'admin'), updateTicket)

module.exports = route
