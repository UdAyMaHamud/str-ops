const mongoose = require('mongoose')

// ====== End-of-Day Report (workbook Section 03, format 1)
const eodSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Types.ObjectId, ref: 'user', required: true },
        day: { type: Number },
        date: { type: Date, required: true },
        hoursWorked: { type: Number },
        tasks: { type: String, default: '' },
        submitted: { type: String, default: '' },
        learned: [{ type: String }],
        blocker: { type: String, default: '' },
        question: { type: String, default: '' },
        confidence: { type: Number, min: 1, max: 5 },
        tomorrowCardRead: { type: Boolean, default: false },
        // Trainer feedback
        reviewNote: { type: String, default: '' },
        reviewedBy: { type: mongoose.Types.ObjectId, ref: 'user' },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('eod', eodSchema)
