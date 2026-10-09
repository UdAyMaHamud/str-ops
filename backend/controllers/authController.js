const { OAuth2Client } = require('google-auth-library')
const userSchema = require('../models/userSchema')
const sendEmail = require('../services/emailServices')
const { emailVerificationTemp, resetPasswordTemp } = require('../services/templates')
const { isValidEmail, isValidPassword } = require('../services/regexValidation')
const {
    generateOTP,
    generateAccToken,
    generateRefreshToken,
    verifyToken,
    getCookieOptions,
    ACCESS_COOKIE_AGE,
    REFRESH_COOKIE_AGE,
} = require('../services/helpers')

const googleClient = new OAuth2Client()
const OTP_LIFETIME = 5 * 60 * 1000
const PASSWORD_RULE = 'Password needs at least 6 characters with a letter and a number'
// Roles a visitor may pick at sign-up. Staff roles are only given by an admin.
const SIGNUP_ROLES = { guest: 'guest', owner: 'client' }

// ====== Shared: set both httpOnly cookies + return the public user
const sendLogin = (req, res, user, message, code = 200) => {
    res.cookie('X_AS-TOKEN', generateAccToken(user), getCookieOptions(req, ACCESS_COOKIE_AGE))
    res.cookie('R_FS-TOKEN', generateRefreshToken(user), getCookieOptions(req, REFRESH_COOKIE_AGE))

    return res.status(code).send({
        success: true,
        message,
        data: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            track: user.track,
            avatar: user.avatar,
        },
    })
}

// ====== Shared: new OTP on the user + email it
const issueOtp = async (user, subject, template) => {
    const otp = generateOTP()
    user.otp = otp
    user.otpExpire = Date.now() + OTP_LIFETIME
    await user.save()
    sendEmail({ email: user.email, subject, template, item: otp })
}

// ====== Sign Up (guests who book, or owners who list; staff accounts are made by an admin)
const signUp = async (req, res) => {
    try {
        const { fullName, email, password, as = 'guest' } = req.body
        if (!fullName || !String(fullName).trim()) return res.status(400).send({ success: false, message: 'Full name is required' })
        if (!email) return res.status(400).send({ success: false, message: 'Email is required' })
        if (!isValidEmail(email)) return res.status(400).send({ success: false, message: 'Invalid email address' })
        if (!password) return res.status(400).send({ success: false, message: 'Password is required' })
        if (!isValidPassword(password)) return res.status(400).send({ success: false, message: PASSWORD_RULE })

        const cleanEmail = email.toLowerCase()
        const existUser = await userSchema.findOne({ email: cleanEmail })
        if (existUser && existUser.isVerified) return res.status(400).send({ success: false, message: 'Email already exists' })

        // Unverified repeat sign-up: refresh the details and send a new code instead of failing
        const user = existUser || new userSchema({ email: cleanEmail, authProvider: 'local' })
        user.role = SIGNUP_ROLES[as] || 'guest'
        user.fullName = String(fullName).trim()
        user.password = password
        await issueOtp(user, 'Verify your email', emailVerificationTemp)

        return res.status(201).send({ success: true, message: 'Please verify your email. We sent you a 4-digit code.', data: { email: cleanEmail } })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Verify OTP (email verification)
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body
        if (!email || !isValidEmail(email)) return res.status(400).send({ success: false, message: 'Invalid request' })
        if (!otp) return res.status(400).send({ success: false, message: 'OTP is required' })

        const user = await userSchema.findOne({
            email: email.toLowerCase(),
            otp: Number(otp),
            otpExpire: { $gt: Date.now() },
        })
        if (!user) return res.status(400).send({ success: false, message: 'Invalid or expired OTP.' })

        user.isVerified = true
        user.otp = undefined
        user.otpExpire = undefined
        await user.save()

        return res.status(200).send({ success: true, message: 'Email verified. You can sign in now.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Resend OTP (codes expire after 5 minutes)
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body
        if (!email || !isValidEmail(email)) return res.status(400).send({ success: false, message: 'Invalid email address' })

        const user = await userSchema.findOne({ email: email.toLowerCase() })
        // Same reply either way so this cannot be used to discover registered emails
        if (user && !user.isVerified) await issueOtp(user, 'Verify your email', emailVerificationTemp)

        return res.status(200).send({ success: true, message: 'If that account needs verifying, a new code has been sent.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Sign In - sets httpOnly cookies
const signIn = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email) return res.status(400).send({ success: false, message: 'Email is required' })
        if (!password) return res.status(400).send({ success: false, message: 'Password is required' })
        // Typed checks also stop a payload like { "$gt": "" } matching any user
        if (!isValidEmail(email) || typeof password !== 'string')
            return res.status(400).send({ success: false, message: 'Invalid email or password.' })

        const user = await userSchema.findOne({ email: email.toLowerCase() })
        if (user && user.authProvider === 'google' && !user.password)
            return res.status(400).send({ success: false, message: 'This account uses Google. Continue with Google instead.' })
        if (!user || !(await user.comparePassword(password)))
            return res.status(400).send({ success: false, message: 'Invalid email or password.' })

        if (!user.isVerified) {
            await issueOtp(user, 'Verify your email', emailVerificationTemp)
            return res.status(403).send({
                success: false,
                needsVerification: true,
                message: 'Please verify your email first. We sent you a new code.',
                data: { email: user.email },
            })
        }

        return sendLogin(req, res, user, 'Login successful')
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Google Sign In / Sign Up (Gmail is already verified by Google)
const googleAuth = async (req, res) => {
    try {
        const { credential, as = 'guest' } = req.body
        if (!process.env.GOOGLE_CLIENT_ID)
            return res.status(503).send({ success: false, message: 'Google sign-in is not configured yet' })
        if (!credential) return res.status(400).send({ success: false, message: 'Google credential is required' })

        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
        const payload = ticket.getPayload()
        if (!payload?.email_verified) return res.status(401).send({ success: false, message: 'Google email is not verified' })

        let user = await userSchema.findOne({ email: payload.email.toLowerCase() })
        let isNew = false
        if (!user) {
            user = await userSchema.create({
                fullName: payload.name,
                email: payload.email.toLowerCase(),
                avatar: payload.picture || '',
                role: SIGNUP_ROLES[as] || 'guest',
                authProvider: 'google',
                googleId: payload.sub,
                isVerified: true,
            })
            isNew = true
        } else {
            // Existing email account: link Google to it (Google proved the email is theirs)
            if (!user.googleId) user.googleId = payload.sub
            if (!user.avatar) user.avatar = payload.picture || ''
            user.isVerified = true
            await user.save()
        }

        return sendLogin(req, res, user, isNew ? 'Account created with Google. Welcome!' : 'Login successful', isNew ? 201 : 200)
    } catch (error) {
        console.log(error)
        return res.status(401).send({ success: false, message: 'Google sign-in failed' })
    }
}

// ====== Logout - httpOnly cookies can only be cleared by the server
const logout = async (req, res) => {
    try {
        res.cookie('X_AS-TOKEN', '', { ...getCookieOptions(req), expires: new Date(0) })
        res.cookie('R_FS-TOKEN', '', { ...getCookieOptions(req), expires: new Date(0) })
        return res.status(200).send({ success: true, message: 'Signed out' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Refresh Token - new access token from the refresh cookie
const refreshToken = async (req, res) => {
    try {
        const token = req.cookies?.['R_FS-TOKEN']
        if (!token) return res.status(401).send({ success: false, message: 'Missing refresh token' })

        const decoded = verifyToken(token)
        if (!decoded || decoded.type !== 'refresh')
            return res.status(401).send({ success: false, message: 'Invalid or expired refresh token' })

        const user = await userSchema.findById(decoded._id)
        if (!user || !user.isVerified) return res.status(401).send({ success: false, message: 'User no longer exists' })

        res.cookie('X_AS-TOKEN', generateAccToken(user), getCookieOptions(req, ACCESS_COOKIE_AGE))
        return res.status(200).send({ success: true, message: 'Token refreshed.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Forgot Password - sends a reset OTP to the email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body
        if (!email) return res.status(400).send({ success: false, message: 'Email is required' })
        if (!isValidEmail(email)) return res.status(400).send({ success: false, message: 'Invalid email address' })

        const user = await userSchema.findOne({ email: email.toLowerCase() })
        // Same reply either way so this cannot be used to discover registered emails
        if (user) await issueOtp(user, 'Reset your password', resetPasswordTemp)

        return res.status(200).send({ success: true, message: 'If that email exists, a reset code has been sent.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Reset Password - verifies the OTP and sets a new password
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body
        if (!email || !isValidEmail(email)) return res.status(400).send({ success: false, message: 'Email is required' })
        if (!otp) return res.status(400).send({ success: false, message: 'OTP is required' })
        if (!newPassword) return res.status(400).send({ success: false, message: 'New password is required' })
        if (!isValidPassword(newPassword)) return res.status(400).send({ success: false, message: PASSWORD_RULE })

        const user = await userSchema.findOne({
            email: email.toLowerCase(),
            otp: Number(otp),
            otpExpire: { $gt: Date.now() },
        })
        if (!user) return res.status(400).send({ success: false, message: 'Invalid or expired OTP.' })

        // Assigning the raw value lets the pre('save') hook hash it
        user.password = newPassword
        user.otp = undefined
        user.otpExpire = undefined
        // The code reached their inbox, so the email is proven too
        user.isVerified = true
        await user.save()

        return res.status(200).send({ success: true, message: 'Password reset. Please sign in.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get Profile
const getProfile = async (req, res) => {
    try {
        return res.status(200).send({ success: true, message: 'Profile fetched.', data: req.user })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { signUp, verifyOtp, resendOtp, signIn, googleAuth, logout, refreshToken, forgotPassword, resetPassword, getProfile }
