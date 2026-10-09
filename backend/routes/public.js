const express = require('express')
const { getPublicProperties, getPublicStats } = require('../controllers/propertyController')
const { getStay, quoteStay } = require('../controllers/bookingController')

const route = express.Router()

// ====== Landing page data (no auth, no owner or guest data)
route.get('/properties', getPublicProperties)
route.get('/stats', getPublicStats)
route.get('/stays/:id', getStay)
route.get('/quote', quoteStay)

module.exports = route
