const mongoose = require('mongoose')

// Draft, do not send: every outgoing message is a draft until a senior reviews it
const draftSchema = new mongoose.Schema(
    {
        thread: { type: mongoose.Types.ObjectId, ref: 'thread' },
        property: { type: mongoose.Types.ObjectId, ref: 'property' },
        reservationCode: { type: String, required: true },
        type: { type: String, enum: ['reply', 'task', 'update'], default: 'reply' },
        body: { type: String, required: true },
        finalBody: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'approved', 'edited', 'rejected'], default: 'pending' },
        feedback: { type: String, default: '' },
        author: { type: mongoose.Types.ObjectId, ref: 'user' },
        reviewer: { type: mongoose.Types.ObjectId, ref: 'user' },
        reviewedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('draft', draftSchema)
