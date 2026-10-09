const jwt = require('jsonwebtoken')

const DAY = 24 * 60 * 60 * 1000

// ====== 4-digit OTP for email verification and password reset
const generateOTP = () => Math.floor(1000 + Math.random() * 9000)

// ====== Access token (short) + refresh token (long), both carried in httpOnly cookies
const generateAccToken = (user) =>
    jwt.sign({ _id: user._id, email: user.email, role: user.role, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '2h' })

const generateRefreshToken = (user) =>
    jwt.sign({ _id: user._id, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '10d' })

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return null
    }
}

// ====== Cookie options - secure/sameSite follow HTTPS automatically
// httpOnly keeps tokens out of document.cookie so an XSS payload cannot read them
const getCookieOptions = (req, maxAge) => {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production'
    return {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        path: '/',
        maxAge,
    }
}

const ACCESS_COOKIE_AGE = 2 * 60 * 60 * 1000 // 2h - matches the access token
const REFRESH_COOKIE_AGE = 10 * 24 * 60 * 60 * 1000 // 10d - matches the refresh token

// ====== Date helpers (all dates are stored as UTC midnight for "nights")
const startOfToday = () => {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)
    return date
}

const dayOffset = (n) => new Date(startOfToday().getTime() + n * DAY)

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000)

const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits))

// ====== ?property=<id> filter shared by list endpoints
// Clients are limited to their own properties (req.ownedProperties, set by ownerScope)
const propertyFilter = (req) => {
    const wanted = req.query.property && req.query.property !== 'all' ? String(req.query.property) : null
    if (req.ownedProperties) {
        if (wanted) return { property: req.ownedProperties.includes(wanted) ? wanted : { $in: [] } }
        return { property: { $in: req.ownedProperties } }
    }
    return wanted ? { property: wanted } : {}
}

// ====== One property for single-property pages (pricing, owner report)
const resolveProperty = async (req) => {
    const propertySchema = require('../models/propertySchema')
    const { property } = propertyFilter(req)
    if (property && typeof property === 'string') return propertySchema.findById(property)
    return propertySchema.findOne(property ? { _id: property } : {}).sort({ code: 1 })
}

module.exports = {
    DAY,
    generateOTP,
    generateAccToken,
    generateRefreshToken,
    verifyToken,
    getCookieOptions,
    ACCESS_COOKIE_AGE,
    REFRESH_COOKIE_AGE,
    startOfToday,
    dayOffset,
    minutesAgo,
    round,
    propertyFilter,
    resolveProperty,
}
