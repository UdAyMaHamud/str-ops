const mongoose = require('mongoose')

const priceDaySchema = new mongoose.Schema(
    {
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        date: { type: Date, required: true },
        currentPrice: { type: Number },
        suggestedPrice: { type: Number },
        minStay: { type: Number, default: 2 },
        event: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('priceday', priceDaySchema)
