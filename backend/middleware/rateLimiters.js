const rateLimit = require('express-rate-limit')

// Brute-force protection for credential endpoints (login / signup / OTP / reset)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
})

// Broad safety net so a single client cannot flood the rest of the API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
})

module.exports = { authLimiter, apiLimiter }
