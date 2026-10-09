const mongoose = require('mongoose')

const turnoverSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String },
        nextReservationCode: { type: String, default: '' },
        scheduledFor: { type: Date },
        cleaner: { type: String },
        status: { type: String, enum: ['scheduled', 'in_progress', 'done'], default: 'scheduled' },
        // ====== Photo QC Checklist areas
        photoQc: [
            {
                area: { type: String },
                pass: { type: Boolean, default: null },
                note: { type: String, default: '' },
            },
        ],
        qcStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        qcReason: { type: String, default: '' },
        supplies: [
            {
                item: { type: String },
                level: { type: Number },
                par: { type: Number },
            },
        ],
    },
    { timestamps: true }
)

module.exports = mongoose.model('turnover', turnoverSchema)
