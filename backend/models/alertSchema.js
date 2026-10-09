const mongoose = require('mongoose')

const alertSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        source: { type: String, enum: ['Minut', 'Domotz', 'Smart lock'] },
        type: { type: String },
        severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
        message: { type: String },
        firstResponse: { type: String },
        reservationCode: { type: String, default: '' },
        status: { type: String, enum: ['open', 'acknowledged', 'resolved'], default: 'open' },
        raisedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('alert', alertSchema)
