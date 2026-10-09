const express = require('express')
const {
    signUp, verifyOtp, resendOtp, signIn, googleAuth, logout, refreshToken, forgotPassword, resetPassword, getProfile,
} = require('../controllers/authController')
const { authMiddleware } = require('../middleware/authMiddleware')
const { authLimiter } = require('../middleware/rateLimiters')

const route = express.Router()

// ====== Public Routes (credential endpoints are rate limited)
route.post('/signup', authLimiter, signUp)
route.post('/verifyotp', authLimiter, verifyOtp)
route.post('/resendotp', authLimiter, resendOtp)
route.post('/signin', authLimiter, signIn)
route.post('/google', authLimiter, googleAuth)
route.post('/forgotpassword', authLimiter, forgotPassword)
route.post('/resetpassword', authLimiter, resetPassword)
route.post('/refreshtoken', refreshToken)
route.post('/logout', logout)

// ====== Private Routes
route.get('/profile', authMiddleware, getProfile)

module.exports = route
