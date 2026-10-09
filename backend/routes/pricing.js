const express = require('express')
const { getPricing } = require('../controllers/pricingController')

const route = express.Router()

route.get('/', getPricing)

module.exports = route
