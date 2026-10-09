const { rateLimit, ipKeyGenerator } = require('express-rate-limit')

// Behind the Vercel site proxy every request can arrive from the same edge address,
// so use the original visitor address (first entry of X-Forwarded-For) to count attempts
const visitorKey = (req) => {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    return ipKeyGenerator(forwarded || req.ip || '')
}

// Brute-force protection for credential endpoints (login / signup / OTP / reset)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: visitorKey,
    message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
})

// Broad safety net so a single client cannot flood the rest of the API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: visitorKey,
    message: { success: false, message: 'Too many requests. Please slow down.' },
})

module.exports = { authLimiter, apiLimiter }
