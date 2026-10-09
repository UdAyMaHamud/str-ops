const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        reservationCode: { type: String },
        channel: { type: String },
        rating: { type: Number },
        text: { type: String },
        reply: { type: String, default: '' },
        repliedAt: { type: Date },
        postedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('review', reviewSchema)
