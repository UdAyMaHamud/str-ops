const express = require('express')
const { getUsers, updateRole } = require('../controllers/userController')

const route = express.Router()

// ====== Admin Routes (mounted behind roleCheck('admin'))
route.get('/all', getUsers)
route.patch('/:id/role', updateRole)

module.exports = route
