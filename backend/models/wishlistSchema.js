const mongoose = require('mongoose')

// ====== Stays a guest saved for later
const wishlistSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Types.ObjectId, ref: 'user', required: true },
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
    },
    { timestamps: true }
)

wishlistSchema.index({ user: 1, property: 1 }, { unique: true })

module.exports = mongoose.model('wishlist', wishlistSchema)
