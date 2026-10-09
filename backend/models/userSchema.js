const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String },
        email: { type: String, required: true, unique: true },
        // Google accounts have no password
        password: { type: String },
        avatar: { type: String, default: '' },
        authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
        googleId: { type: String },
        // guest = books stays on the public site; client = property owner (sees only their own properties)
        // trainee = staff, read-only + drafts; senior/admin = staff who approve and change records
        role: { type: String, default: 'guest', enum: ['guest', 'client', 'trainee', 'senior', 'admin'] },
        track: { type: String, default: '' },
        // Trainees only: first day of the 30-day academy (drives the Day Card on their dashboard)
        trainingStart: { type: Date },
        // Email accounts start unverified until the OTP is confirmed; Google accounts are verified by Google
        isVerified: { type: Boolean, default: false },
        otp: { type: Number, default: null },
        otpExpire: { type: Date },
    },
    { timestamps: true }
)

// ====== Hash password before save
userSchema.pre('save', async function () {
    const user = this
    if (!user.password || !user.isModified('password')) return
    try {
        user.password = await bcrypt.hash(user.password, 10)
    } catch (err) {
        console.log(err)
    }
})

// ====== Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false
    return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model('user', userSchema)
