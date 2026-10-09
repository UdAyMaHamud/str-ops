const userSchema = require('../models/userSchema')
const { verifyToken } = require('../services/helpers')

const authMiddleware = async (req, res, next) => {
    try {
        // ====== httpOnly cookie first, Authorization header as fallback
        const cookieToken = req.cookies?.['X_AS-TOKEN']
        const headerToken = req.headers?.authorization?.replace(/^Bearer\s+/i, '')
        const token = cookieToken || headerToken
        if (!token) return res.status(401).send({ success: false, message: 'Unauthorized. Please login.' })

        const decoded = verifyToken(token)
        if (!decoded || decoded.type !== 'access')
            return res.status(401).send({ success: false, message: 'Invalid or expired token.' })

        // Load the user so a role change or deleted account takes effect immediately
        const user = await userSchema.findById(decoded._id).select('-password -otp -otpExpire')
        if (!user) return res.status(401).send({ success: false, message: 'User not found.' })
        if (!user.isVerified) return res.status(403).send({ success: false, message: 'Please verify your email first.' })

        req.user = user
        next()
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { authMiddleware }
