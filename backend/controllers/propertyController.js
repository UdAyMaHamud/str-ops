const propertySchema = require('../models/propertySchema')
const priceDaySchema = require('../models/priceDaySchema')
const reviewSchema = require('../models/reviewSchema')
const reservationSchema = require('../models/reservationSchema')
const { calcKpis } = require('../services/metrics')
const { dayOffset, round } = require('../services/helpers')

const AUDIT_CHECKS = [
    'Title shows the single best feature and stays within the character limit',
    'First photo is the strongest room, not the outside or a bathroom',
    'Photo order follows a walk-through (living, kitchen, bedrooms, bath, outside)',
    'First paragraph answers: who is it for, what makes it special, where it is',
    'All real amenities are tagged (wifi speed, parking, workspace, AC, washer)',
    'House rules are clear and friendly',
    'Price looks right against 3 similar nearby listings',
    'Reviews are replied to, especially negative ones',
]

const CHANNELS = ['Airbnb', 'VRBO', 'Booking.com', 'Direct']
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles']

// ====== Get Properties (with listing audit)
const getProperties = async (req, res) => {
    try {
        const query = req.ownedProperties ? { _id: { $in: req.ownedProperties } } : {}
        const properties = await propertySchema.find(query).populate('owner', 'fullName').sort({ code: 1 })
        const data = properties.map((p) => ({
            ...p.toObject(),
            auditTotal: (p.audit?.scores || []).reduce((s, n) => s + n, 0),
            auditMax: AUDIT_CHECKS.length * 2,
            isAudited: (p.audit?.scores || []).length === AUDIT_CHECKS.length,
        }))
        return res.status(200).send({ success: true, message: 'Properties fetched.', data, checks: AUDIT_CHECKS })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Create Property (clients add their own; admins can add for anyone)
const createProperty = async (req, res) => {
    try {
        const { name, city, state, timezone, bedrooms, basePrice, minPrice, maxPrice, cleaningFee, channels = [], description = '' } = req.body
        if (!name || !name.trim()) return res.status(400).send({ success: false, message: 'Property name is required' })
        if (!city || !state) return res.status(400).send({ success: false, message: 'City and state are required' })
        if (!Number(bedrooms) || Number(bedrooms) < 1) return res.status(400).send({ success: false, message: 'Bedrooms must be at least 1' })
        if (!Number(basePrice)) return res.status(400).send({ success: false, message: 'Base nightly price is required' })
        const min = Number(minPrice) || Math.round(Number(basePrice) * 0.7)
        const max = Number(maxPrice) || Math.round(Number(basePrice) * 2.2)
        if (min > Number(basePrice) || max < Number(basePrice))
            return res.status(400).send({ success: false, message: 'Base price must sit between the min and max price' })

        const count = await propertySchema.countDocuments()
        const property = await propertySchema.create({
            code: `P${count + 1}`,
            name: name.trim(),
            owner: req.user._id,
            city: city.trim(),
            state: state.trim().toUpperCase().slice(0, 2),
            timezone: TIMEZONES.includes(timezone) ? timezone : 'America/New_York',
            bedrooms: Number(bedrooms),
            tier: 'Starter',
            channels: channels.filter((c) => CHANNELS.includes(c)),
            basePrice: Number(basePrice),
            minPrice: min,
            maxPrice: max,
            cleaningFee: Number(cleaningFee) || 0,
            cleaningCost: Math.round((Number(cleaningFee) || 0) * 0.75),
            softwareCost: 30,
            description: description.trim(),
            audit: { scores: [], missingAmenities: [] },
        })

        // Start a 60-day calendar at the base price so pricing works on day one
        const days = []
        for (let d = 0; d < 60; d++) {
            const weekday = dayOffset(d).getUTCDay()
            const price = Math.round(property.basePrice * (weekday === 5 || weekday === 6 ? 1.2 : 1))
            days.push({ property: property._id, date: dayOffset(d), currentPrice: price, suggestedPrice: price, minStay: 2 })
        }
        await priceDaySchema.insertMany(days)

        return res.status(201).send({ success: true, message: 'Property added. Our team will audit the listing next.', data: property })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Audit a listing (senior / admin): 8 checks scored 0-2, plus market benchmark
// An audited listing with a photo is what goes live on the public site
const auditProperty = async (req, res) => {
    try {
        const { scores, missingAmenities = [], marketOccupancy, marketAdr } = req.body
        if (!Array.isArray(scores) || scores.length !== AUDIT_CHECKS.length || scores.some((s) => ![0, 1, 2].includes(Number(s))))
            return res.status(400).send({ success: false, message: `Score all ${AUDIT_CHECKS.length} checks with 0, 1 or 2` })
        if (marketOccupancy !== undefined && marketOccupancy !== '' && !(Number(marketOccupancy) > 0 && Number(marketOccupancy) <= 1))
            return res.status(400).send({ success: false, message: 'Market occupancy must be between 1% and 100%' })

        const property = await propertySchema.findById(req.params.id)
        if (!property) return res.status(404).send({ success: false, message: 'Property not found' })

        property.audit = {
            scores: scores.map(Number),
            missingAmenities: (Array.isArray(missingAmenities) ? missingAmenities : []).map((a) => String(a).trim()).filter(Boolean),
            auditedAt: new Date(),
        }
        if (marketOccupancy) property.marketOccupancy = Number(marketOccupancy)
        if (marketAdr) property.marketAdr = Number(marketAdr)
        await property.save()

        return res.status(200).send({ success: true, message: 'Audit saved.', data: property })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Assign a property to an owner (admin). Synced Hostaway listings arrive without one.
const assignOwner = async (req, res) => {
    try {
        const userSchema = require('../models/userSchema')
        const { owner } = req.body
        const property = await propertySchema.findById(req.params.id)
        if (!property) return res.status(404).send({ success: false, message: 'Property not found' })
        if (owner) {
            const user = await userSchema.findById(owner)
            if (!user || user.role !== 'client') return res.status(400).send({ success: false, message: 'Pick an owner account' })
        }
        property.owner = owner || undefined
        await property.save()
        return res.status(200).send({ success: true, message: owner ? 'Owner assigned.' : 'Owner removed.' })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Public: featured stays for the landing page (no owner or guest data)
const getPublicProperties = async (req, res) => {
    try {
        // Only audited listings with a photo go public
        const properties = await propertySchema.find({ image: { $ne: '' }, 'audit.scores.7': { $exists: true } }).sort({ code: 1 }).limit(48)
        const reviews = await reviewSchema.find({ property: { $in: properties.map((p) => p._id) } })
        const data = properties.map((p) => {
            const own = reviews.filter((r) => String(r.property) === String(p._id))
            return {
                _id: p._id,
                name: p.name,
                city: p.city,
                state: p.state,
                bedrooms: p.bedrooms,
                maxGuests: p.maxGuests || p.bedrooms * 2,
                basePrice: p.basePrice,
                image: p.image,
                description: p.description,
                rating: own.length ? round(own.reduce((s, r) => s + r.rating, 0) / own.length, 1) : null,
                reviewCount: own.length,
            }
        })
        return res.status(200).send({ success: true, message: 'Stays fetched.', data })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Public: headline numbers for the landing page
const getPublicStats = async (req, res) => {
    try {
        const properties = await propertySchema.find()
        const reservations = await reservationSchema.find({ checkOut: { $gt: dayOffset(-30) }, checkIn: { $lt: dayOffset(0) } })
        const kpis = calcKpis(reservations, properties, dayOffset(-30), dayOffset(0))
        const reviews = await reviewSchema.find()
        const fiveStar = reviews.filter((r) => r.rating >= 4).length
        return res.status(200).send({
            success: true,
            message: 'Stats fetched.',
            data: {
                properties: properties.length,
                cities: new Set(properties.map((p) => p.city)).size,
                occupancy: kpis.occupancy,
                marketOccupancy: kpis.market.occupancy,
                happyGuests: reviews.length ? round(fiveStar / reviews.length, 2) : null,
                avgRating: reviews.length ? round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, 1) : null,
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getProperties, createProperty, auditProperty, assignOwner, getPublicProperties, getPublicStats }
