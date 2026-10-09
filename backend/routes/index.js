const express = require('express')
const authRoute = require('./auth')
const systemRoute = require('./system')
const publicRoute = require('./public')
const overviewRoute = require('./overview')
const propertyRoute = require('./property')
const inboxRoute = require('./inbox')
const turnoverRoute = require('./turnover')
const alertRoute = require('./alert')
const ticketRoute = require('./ticket')
const pricingRoute = require('./pricing')
const screeningRoute = require('./screening')
const reviewRoute = require('./review')
const reportRoute = require('./report')
const integrationRoute = require('./integration')
const escalationRoute = require('./escalation')
const homeRoute = require('./home')
const trainingRoute = require('./training')
const userRoute = require('./user')
const bookingRoute = require('./booking')
const webhookRoute = require('./webhook')
const { authMiddleware } = require('../middleware/authMiddleware')
const roleCheck = require('../middleware/roleCheckMiddleware')
const ownerScope = require('../middleware/ownerScopeMiddleware')

const route = express.Router()

// Staff only: internal tools clients never see
const staffOnly = roleCheck('trainee', 'senior', 'admin')
// Owners + staff: guests never reach the dashboard API
const insiders = roleCheck('client', 'trainee', 'senior', 'admin')

// ====== Public
route.use('/auth', authRoute)
route.use('/system', systemRoute)
route.use('/public', publicRoute)
// Hostaway posts here (protected by its own basic auth)
route.use('/webhooks', webhookRoute)

// ====== Signed in: clients see only their own properties (ownerScope)
route.use('/overview', authMiddleware, insiders, ownerScope, overviewRoute)
route.use('/property', authMiddleware, insiders, ownerScope, propertyRoute)
route.use('/turnover', authMiddleware, insiders, ownerScope, turnoverRoute)
route.use('/alert', authMiddleware, insiders, ownerScope, alertRoute)
route.use('/ticket', authMiddleware, insiders, ownerScope, ticketRoute)
route.use('/pricing', authMiddleware, insiders, ownerScope, pricingRoute)
route.use('/review', authMiddleware, insiders, ownerScope, reviewRoute)
route.use('/report', authMiddleware, insiders, ownerScope, reportRoute)
route.use('/home', authMiddleware, insiders, ownerScope, homeRoute)

// ====== Staff only
route.use('/inbox', authMiddleware, staffOnly, inboxRoute)
route.use('/screening', authMiddleware, staffOnly, screeningRoute)
route.use('/integration', authMiddleware, staffOnly, integrationRoute)
route.use('/escalation', authMiddleware, staffOnly, escalationRoute)
route.use('/training', authMiddleware, staffOnly, trainingRoute)

// ====== Guest bookings (guest + staff routes, role-checked inside)
route.use('/booking', authMiddleware, bookingRoute)

// ====== Admin only
route.use('/user', authMiddleware, roleCheck('admin'), userRoute)

module.exports = route
