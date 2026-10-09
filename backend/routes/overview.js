const express = require('express')
const { getOverview } = require('../controllers/overviewController')

const route = express.Router()

route.get('/', getOverview)

module.exports = route
