const mongoose = require('mongoose')

// A risk score is a signal, not a decision. Never store ID images here.
const screeningSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String, required: true },
        checkIn: { type: Date },
        riskScore: { type: Number },
        flags: [{ type: String }],
        idVerified: { type: Boolean, default: false },
        decision: { type: String, enum: ['pending', 'approve', 'investigate', 'decline'], default: 'pending' },
        reason: { type: String, default: '' },
        followUp: { type: String, default: '' },
        decidedBy: { type: mongoose.Types.ObjectId, ref: 'user' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('screening', screeningSchema)
