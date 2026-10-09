const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String, default: '' },
        issue: { type: String, required: true },
        category: { type: String },
        urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        vendor: { type: String, default: '' },
        // Where to find access, never the code itself
        accessInfo: { type: String, default: '' },
        photos: { type: Number, default: 0 },
        cost: { type: Number, default: 0 },
        status: { type: String, enum: ['open', 'assigned', 'in_progress', 'closed'], default: 'open' },
        updates: [{ note: { type: String }, at: { type: Date } }],
        closedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('ticket', ticketSchema)
