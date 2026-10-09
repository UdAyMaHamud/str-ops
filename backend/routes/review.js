const express = require('express')
const { getReviews, getClaims, updateClaim } = require('../controllers/reviewController')
const roleCheck = require('../middleware/roleCheckMiddleware')

const route = express.Router()

route.get('/all', getReviews)
route.get('/claims', getClaims)

// ====== Senior Routes
route.patch('/claims/:id', roleCheck('senior', 'admin'), updateClaim)

module.exports = route
