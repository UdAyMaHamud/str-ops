const mongoose = require('mongoose')

const claimSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String },
        channel: { type: String },
        issue: { type: String },
        amount: { type: Number },
        checkoutDate: { type: Date },
        deadline: { type: Date },
        // ====== Claim Pack Checklist
        checklist: {
            checkInPhotos: { type: Boolean, default: false },
            checkoutPhotos: { type: Boolean, default: false },
            timeline: { type: Boolean, default: false },
            guestMessages: { type: Boolean, default: false },
            repairQuote: { type: Boolean, default: false },
            filedInTime: { type: Boolean, default: false },
            firstMessage: { type: Boolean, default: false },
        },
        status: { type: String, enum: ['open', 'filed', 'paid', 'denied'], default: 'open' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('claim', claimSchema)
