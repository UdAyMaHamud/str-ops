const mongoose = require('mongoose')

const propertySchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        owner: { type: mongoose.Types.ObjectId, ref: 'user' },
        image: { type: String, default: '' },
        description: { type: String, default: '' },
        maxGuests: { type: Number },
        amenities: [{ type: String }],
        // Id in Hostaway for synced listings
        hostawayId: { type: String, index: true, sparse: true },
        city: { type: String },
        state: { type: String },
        timezone: { type: String, default: 'America/New_York' },
        bedrooms: { type: Number },
        tier: { type: String, enum: ['Starter', 'Growth', 'Pro'], default: 'Starter' },
        channels: [{ type: String }],
        basePrice: { type: Number },
        minPrice: { type: Number },
        maxPrice: { type: Number },
        cleaningFee: { type: Number },
        cleaningCost: { type: Number },
        softwareCost: { type: Number },
        marketOccupancy: { type: Number },
        marketAdr: { type: Number },
        // ====== Listing Audit Checklist (8 checks, each scored 0, 1 or 2)
        audit: {
            scores: [{ type: Number }],
            missingAmenities: [{ type: String }],
            auditedAt: { type: Date },
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('property', propertySchema)
