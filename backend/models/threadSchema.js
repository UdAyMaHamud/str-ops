const mongoose = require('mongoose')

const threadSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String, required: true },
        channel: { type: String },
        stage: {
            type: String,
            enum: ['booking', 'pre_arrival', 'check_in', 'mid_stay', 'pre_checkout', 'post_checkout'],
        },
        messages: [
            {
                sender: { type: String, enum: ['guest', 'host'] },
                body: { type: String },
                sentAt: { type: Date },
            },
        ],
        needsReply: { type: Boolean, default: false },
        escalate: { type: Boolean, default: false },
        escalateTo: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('thread', threadSchema)
