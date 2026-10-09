const mongoose = require('mongoose')

// ====== Escalation list: problem type -> who to contact
const contactSchema = new mongoose.Schema(
    {
        problemType: { type: String, required: true },
        contact: { type: String },
        channel: { type: String },
        urgency: { type: String, enum: ['now', 'within_1_hr', 'today'] },
        notes: { type: String, default: '' },
        order: { type: Number },
    },
    { timestamps: true }
)

module.exports = mongoose.model('contact', contactSchema)
