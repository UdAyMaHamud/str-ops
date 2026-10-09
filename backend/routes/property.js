const express = require('express')
const { getProperties, createProperty, auditProperty, assignOwner } = require('../controllers/propertyController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getProperties)

// ====== Owner Routes
route.post('/create', roleCheck('client', 'admin'), createProperty)

// ====== Senior Routes
route.patch('/:id/audit', roleCheck('senior', 'admin'), auditProperty)

// ====== Admin Routes
route.patch('/:id/owner', roleCheck('admin'), assignOwner)

module.exports = route
