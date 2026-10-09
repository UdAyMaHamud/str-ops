const mongoose = require('mongoose')

// ====== Escalation Report format (workbook Section 03)
const escalationSchema = new mongoose.Schema(
    {
        urgency: { type: String, enum: ['now', 'within_1_hr', 'today'], default: 'today' },
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String, default: '' },
        whatHappened: { type: String, required: true },
        alreadyDid: { type: String, default: '' },
        need: { type: String, enum: ['decision', 'approval', 'access', 'call_vendor'], default: 'decision' },
        suggestion: { type: String, default: '' },
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
        createdBy: { type: mongoose.Types.ObjectId, ref: 'user' },
        resolvedBy: { type: mongoose.Types.ObjectId, ref: 'user' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('escalation', escalationSchema)
