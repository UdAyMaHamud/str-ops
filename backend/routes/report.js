const express = require('express')
const { getOwnerReport } = require('../controllers/reportController')

const route = express.Router()

route.get('/owner', getOwnerReport)

module.exports = route
