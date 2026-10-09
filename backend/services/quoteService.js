const priceDaySchema = require('../models/priceDaySchema')
const reservationSchema = require('../models/reservationSchema')
const { DAY, startOfToday, round } = require('./helpers')

// The single place that turns dates into a price for a guest booking (like pricingEngine in Air_Bnb)
const MAX_NIGHTS = 30
const BOOKING_WINDOW_DAYS = 365

const toDay = (value) => {
    const date = new Date(value)
    if (isNaN(date)) return null
    date.setUTCHours(0, 0, 0, 0)
    return date
}

// Weekend uplift when there is no PriceLabs price for that night yet
const fallbackPrice = (property, date) => {
    const weekday = date.getUTCDay()
    return Math.round(property.basePrice * (weekday === 5 || weekday === 6 ? 1.2 : 1))
}

// ====== Nights that are taken (confirmed, pending requests and owner blocks)
const getBlockedNights = async (propertyId, from, to) => {
    const stays = await reservationSchema
        .find({ property: propertyId, status: { $in: ['confirmed', 'pending'] }, checkIn: { $lt: to }, checkOut: { $gt: from } })
        .select('checkIn checkOut')
    const blocked = new Set()
    stays.forEach((s) => {
        for (let d = Math.max(new Date(s.checkIn).getTime(), from.getTime()); d < Math.min(new Date(s.checkOut).getTime(), to.getTime()); d += DAY) {
            blocked.add(d)
        }
    })
    return blocked
}

// ====== Price + availability for each night in [from, to)
const getCalendar = async (property, from, to) => {
    const [priceDays, blocked] = await Promise.all([
        priceDaySchema.find({ property: property._id, date: { $gte: from, $lt: to } }),
        getBlockedNights(property._id, from, to),
    ])
    const byDay = {}
    priceDays.forEach((p) => (byDay[new Date(p.date).getTime()] = p))

    const nights = []
    for (let d = from.getTime(); d < to.getTime(); d += DAY) {
        const date = new Date(d)
        const priced = byDay[d]
        nights.push({
            date,
            price: priced?.currentPrice || fallbackPrice(property, date),
            minStay: priced?.minStay || 2,
            available: !blocked.has(d),
        })
    }
    return nights
}

// ====== Quote a stay: validates dates, guests, availability and minimum stay
const getQuote = async (property, { checkIn, checkOut, guests }) => {
    const from = toDay(checkIn)
    const to = toDay(checkOut)
    const today = startOfToday()
    const guestCount = Number(guests) || 1
    const maxGuests = property.maxGuests || property.bedrooms * 2

    if (!from || !to) return { ok: false, message: 'Choose check-in and check-out dates' }
    if (from < today) return { ok: false, message: 'Check-in cannot be in the past' }
    if (from.getTime() > today.getTime() + BOOKING_WINDOW_DAYS * DAY) return { ok: false, message: 'Bookings open up to 12 months ahead' }
    const nightsCount = Math.round((to - from) / DAY)
    if (nightsCount < 1) return { ok: false, message: 'Check-out must be after check-in' }
    if (nightsCount > MAX_NIGHTS) return { ok: false, message: `Stays are up to ${MAX_NIGHTS} nights` }
    if (guestCount < 1 || guestCount > maxGuests) return { ok: false, message: `This home sleeps up to ${maxGuests} guests` }

    const nights = await getCalendar(property, from, to)
    if (nights.some((n) => !n.available)) return { ok: false, message: 'Some of those nights are already booked' }
    const minStay = nights[0].minStay
    if (nightsCount < minStay) return { ok: false, message: `Minimum stay for that check-in is ${minStay} nights` }

    const subtotal = nights.reduce((s, n) => s + n.price, 0)
    const cleaningFee = property.cleaningFee || 0
    return {
        ok: true,
        quote: {
            checkIn: from,
            checkOut: to,
            nights: nightsCount,
            guests: guestCount,
            nightly: nights.map((n) => ({ date: n.date, price: n.price })),
            avgNightly: round(subtotal / nightsCount),
            subtotal: round(subtotal),
            cleaningFee: round(cleaningFee),
            total: round(subtotal + cleaningFee),
        },
    }
}

module.exports = { getQuote, getCalendar, toDay, MAX_NIGHTS }
