const express = require('express')
const crypto = require('crypto')
const { applyReservationEvent } = require('../services/hostawayService')

const route = express.Router()

// Constant-time compare so the password cannot be guessed byte by byte
const safeEqual = (a, b) => {
    const left = Buffer.from(String(a))
    const right = Buffer.from(String(b))
    return left.length === right.length && crypto.timingSafeEqual(left, right)
}

// ====== Basic auth that you also enter on the Hostaway webhook settings page
const hostawayAuth = (req, res, next) => {
    const user = process.env.HOSTAWAY_WEBHOOK_USER
    const pass = process.env.HOSTAWAY_WEBHOOK_PASS
    // An unprotected webhook would let anyone write bookings, so refuse until it is configured
    if (!user || !pass) return res.status(503).send({ success: false, message: 'Webhook login is not configured' })

    const [scheme, encoded] = String(req.headers.authorization || '').split(' ')
    const [givenUser, ...rest] = Buffer.from(encoded || '', 'base64').toString().split(':')
    if (scheme !== 'Basic' || !safeEqual(givenUser, user) || !safeEqual(rest.join(':'), pass))
        return res.status(401).send({ success: false, message: 'Unauthorized' })
    next()
}

// ====== Hostaway unified webhook: reservation created / updated
route.post('/hostaway', hostawayAuth, async (req, res) => {
    try {
        const event = String(req.body?.event || '')
        const payload = req.body?.data || req.body?.payload || req.body
        if (event && !event.toLowerCase().includes('reservation'))
            return res.status(200).send({ success: true, message: `Event ${event} ignored.` })

        const result = await applyReservationEvent(payload)
        return res.status(200).send({ success: result.ok, message: result.message })
    } catch (error) {
        console.log('Hostaway webhook failed:', error.message)
        // 500 makes Hostaway retry later
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
})

module.exports = route
