const mongoose = require('mongoose')
const propertySchema = require('../models/propertySchema')
const reservationSchema = require('../models/reservationSchema')
const reviewSchema = require('../models/reviewSchema')
const threadSchema = require('../models/threadSchema')
const { getQuote, getCalendar } = require('../services/quoteService')
const { DAY, startOfToday, round } = require('../services/helpers')

// Same rule as the landing page: only audited listings with a photo are bookable
const LIVE_QUERY = { image: { $ne: '' }, 'audit.scores.7': { $exists: true } }
const CALENDAR_DAYS = 180

const findLiveProperty = async (id) => {
    if (!mongoose.isValidObjectId(id)) return null
    return propertySchema.findOne({ _id: id, ...LIVE_QUERY })
}

const makeDirectCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let i = 0; i < 10; i++) {
        const code = 'DB-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        if (!(await reservationSchema.exists({ code }))) return code
    }
    throw new Error('Could not create a booking code')
}

// ====== Public: one stay with calendar and reviews (no owner or guest data)
const getStay = async (req, res) => {
    try {
        const property = await findLiveProperty(req.params.id)
        if (!property) return res.status(404).send({ success: false, message: 'Stay not found' })

        const today = startOfToday()
        const calendar = await getCalendar(property, today, new Date(today.getTime() + CALENDAR_DAYS * DAY))
        const reviews = await reviewSchema.find({ property: property._id }).sort({ postedAt: -1 })

        return res.status(200).send({
            success: true,
            message: 'Stay fetched.',
            data: {
                _id: property._id,
                name: property.name,
                city: property.city,
                state: property.state,
                bedrooms: property.bedrooms,
                maxGuests: property.maxGuests || property.bedrooms * 2,
                description: property.description,
                amenities: property.amenities,
                image: property.image,
                basePrice: property.basePrice,
                cleaningFee: property.cleaningFee,
                rating: reviews.length ? round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, 1) : null,
                // Reviews show rating, text and month only; never who wrote them
                reviews: reviews.slice(0, 12).map((r) => ({ _id: r._id, rating: r.rating, text: r.text, postedAt: r.postedAt, reply: r.reply })),
                reviewCount: reviews.length,
                calendar: calendar.map((n) => ({ date: n.date, price: n.price, minStay: n.minStay, available: n.available })),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Public: price for a stay
const quoteStay = async (req, res) => {
    try {
        const property = await findLiveProperty(req.query.property)
        if (!property) return res.status(404).send({ success: false, message: 'Stay not found' })
        const result = await getQuote(property, req.query)
        if (!result.ok) return res.status(400).send({ success: false, message: result.message })
        return res.status(200).send({ success: true, message: 'Quote ready.', data: result.quote })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Guest: request a booking (a senior confirms it; nothing is charged yet)
const createBooking = async (req, res) => {
    try {
        const { property: propertyId, checkIn, checkOut, guests, message = '' } = req.body
        const property = await findLiveProperty(propertyId)
        if (!property) return res.status(404).send({ success: false, message: 'Stay not found' })

        const result = await getQuote(property, { checkIn, checkOut, guests })
        if (!result.ok) return res.status(400).send({ success: false, message: result.message })
        const quote = result.quote

        const openRequests = await reservationSchema.countDocuments({ guest: req.user._id, status: 'pending' })
        if (openRequests >= 3) return res.status(400).send({ success: false, message: 'You already have 3 open requests. Wait for a reply first.' })

        const firstName = (req.user.fullName || 'Guest').split(' ')[0]
        const code = await makeDirectCode()
        const reservation = await reservationSchema.create({
            code,
            property: property._id,
            type: 'guest',
            guest: req.user._id,
            guestFirstName: firstName,
            channel: 'Direct',
            checkIn: quote.checkIn,
            checkOut: quote.checkOut,
            nights: quote.nights,
            guests: quote.guests,
            nightlyRate: quote.avgNightly,
            roomRevenue: quote.subtotal,
            cleaningFee: quote.cleaningFee,
            otaFee: 0,
            status: 'pending',
            bookedAt: new Date(),
        })

        // The request lands in the team inbox like any other guest message
        await threadSchema.create({
            property: property._id,
            reservationCode: code,
            channel: 'Direct',
            stage: 'booking',
            needsReply: true,
            messages: [{
                sender: 'guest',
                body: `Booking request: ${quote.nights} nights for ${quote.guests} guest(s), total $${quote.total}.${String(message).trim() ? ` ${String(message).trim().slice(0, 1000)}` : ''}`,
                sentAt: new Date(),
            }],
        })

        return res.status(201).send({ success: true, message: 'Request sent. Our team confirms within 24 hours.', data: { _id: reservation._id, code, ...quote } })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Guest: my trips
const getMyBookings = async (req, res) => {
    try {
        const bookings = await reservationSchema
            .find({ guest: req.user._id })
            .populate('property', 'name city state image')
            .sort({ checkIn: -1 })
        const reviewed = await reviewSchema.find({ reservationCode: { $in: bookings.map((b) => b.code) } }).select('reservationCode rating text')
        const today = startOfToday()

        const data = bookings.map((b) => {
            const review = reviewed.find((r) => r.reservationCode === b.code)
            return {
                _id: b._id,
                code: b.code,
                property: b.property,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                nights: b.nights,
                guests: b.guests,
                total: round(b.roomRevenue + b.cleaningFee),
                status: b.status,
                bookedAt: b.bookedAt,
                canCancel: ['pending', 'confirmed'].includes(b.status) && new Date(b.checkIn) > today,
                canReview: b.status === 'confirmed' && new Date(b.checkOut) <= today && !review,
                review: review ? { rating: review.rating, text: review.text } : null,
            }
        })
        return res.status(200).send({ success: true, message: 'Trips fetched.', data })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Guest: cancel my own booking before check-in
const cancelBooking = async (req, res) => {
    try {
        const booking = await reservationSchema.findOne({ _id: req.params.id, guest: req.user._id })
        if (!booking) return res.status(404).send({ success: false, message: 'Booking not found' })
        if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).send({ success: false, message: 'This booking is already cancelled' })
        if (new Date(booking.checkIn) <= startOfToday()) return res.status(400).send({ success: false, message: 'A stay that has started cannot be cancelled online. Message us instead.' })

        booking.status = 'cancelled'
        booking.cancelledAt = new Date()
        await booking.save()
        return res.status(200).send({ success: true, message: 'Booking cancelled.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Guest: review a finished stay (one review per stay)
const reviewBooking = async (req, res) => {
    try {
        const { rating, text } = req.body
        if (!(Number(rating) >= 1 && Number(rating) <= 5)) return res.status(400).send({ success: false, message: 'Rating must be 1 to 5 stars' })
        if (!text || String(text).trim().length < 10) return res.status(400).send({ success: false, message: 'Write at least a sentence about your stay' })

        const booking = await reservationSchema.findOne({ _id: req.params.id, guest: req.user._id })
        if (!booking) return res.status(404).send({ success: false, message: 'Booking not found' })
        if (booking.status !== 'confirmed' || new Date(booking.checkOut) > startOfToday())
            return res.status(400).send({ success: false, message: 'You can review a stay after checkout' })
        if (await reviewSchema.exists({ reservationCode: booking.code }))
            return res.status(400).send({ success: false, message: 'You already reviewed this stay' })

        await reviewSchema.create({
            property: booking.property,
            reservationCode: booking.code,
            channel: 'Direct',
            rating: Number(rating),
            text: String(text).trim().slice(0, 2000),
            postedAt: new Date(),
        })
        return res.status(201).send({ success: true, message: 'Thanks for your review!' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Staff: booking requests waiting for a decision
const getBookingRequests = async (req, res) => {
    try {
        const requests = await reservationSchema
            .find({ status: 'pending' })
            .populate('property', 'code name')
            .sort({ bookedAt: 1 })
        return res.status(200).send({ success: true, message: 'Booking requests fetched.', data: requests })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Senior: confirm or decline a booking request
const decideBooking = async (req, res) => {
    try {
        const { decision } = req.body
        if (!['confirm', 'decline'].includes(decision)) return res.status(400).send({ success: false, message: 'Decision must be confirm or decline' })

        const booking = await reservationSchema.findById(req.params.id)
        if (!booking) return res.status(404).send({ success: false, message: 'Booking not found' })
        if (booking.status !== 'pending') return res.status(400).send({ success: false, message: 'This request was already decided' })

        booking.status = decision === 'confirm' ? 'confirmed' : 'cancelled'
        if (decision === 'decline') booking.cancelledAt = new Date()
        await booking.save()
        return res.status(200).send({ success: true, message: decision === 'confirm' ? `Booking ${booking.code} confirmed.` : `Booking ${booking.code} declined.` })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getStay, quoteStay, createBooking, getMyBookings, cancelBooking, reviewBooking, getBookingRequests, decideBooking, LIVE_QUERY }
