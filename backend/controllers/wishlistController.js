const mongoose = require('mongoose')
const wishlistSchema = require('../models/wishlistSchema')
const propertySchema = require('../models/propertySchema')
const { LIVE_QUERY } = require('./bookingController')

// ====== Save or unsave a stay
const toggleWishlist = async (req, res) => {
    try {
        const { property } = req.body
        if (!mongoose.isValidObjectId(property)) return res.status(400).send({ success: false, message: 'Invalid stay' })
        if (!(await propertySchema.exists({ _id: property, ...LIVE_QUERY }))) return res.status(404).send({ success: false, message: 'Stay not found' })

        const existing = await wishlistSchema.findOne({ user: req.user._id, property })
        if (existing) {
            await existing.deleteOne()
            return res.status(200).send({ success: true, message: 'Removed from saved stays.', data: { saved: false } })
        }
        await wishlistSchema.create({ user: req.user._id, property })
        return res.status(201).send({ success: true, message: 'Saved.', data: { saved: true } })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== My saved stays
const getMyWishlist = async (req, res) => {
    try {
        const items = await wishlistSchema
            .find({ user: req.user._id })
            .populate('property', 'name city state image bedrooms maxGuests basePrice description')
            .sort({ createdAt: -1 })
        return res.status(200).send({ success: true, message: 'Saved stays fetched.', data: items.filter((i) => i.property) })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { toggleWishlist, getMyWishlist }
