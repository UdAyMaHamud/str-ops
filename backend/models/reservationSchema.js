const mongoose = require('mongoose')

// Guest PII rule: only reservation code + first name. No phone, ID or payment data.
const reservationSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true },
        property: { type: mongoose.Types.ObjectId, ref: 'property', required: true },
        type: { type: String, enum: ['guest', 'owner_block'], default: 'guest' },
        guestFirstName: { type: String },
        channel: { type: String, enum: ['Airbnb', 'VRBO', 'Booking.com', 'Direct', 'Owner'] },
        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },
        nights: { type: Number },
        guests: { type: Number },
        nightlyRate: { type: Number, default: 0 },
        roomRevenue: { type: Number, default: 0 },
        cleaningFee: { type: Number, default: 0 },
        otaFee: { type: Number, default: 0 },
        // pending = booking request from the public site, waiting for a senior to confirm
        status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
        // Guest account for bookings made on our site (channel Direct)
        guest: { type: mongoose.Types.ObjectId, ref: 'user' },
        // Id in Hostaway for synced reservations
        hostawayId: { type: String, index: true, sparse: true },
        cancelledAt: { type: Date },
        bookedAt: { type: Date },
    },
    { timestamps: true }
)

module.exports = mongoose.model('reservation', reservationSchema)
