const reservationSchema = require('../models/reservationSchema')
const reviewSchema = require('../models/reviewSchema')
const ticketSchema = require('../models/ticketSchema')
const priceDaySchema = require('../models/priceDaySchema')
const screeningSchema = require('../models/screeningSchema')
const { calcKpis } = require('../services/metrics')
const { round, resolveProperty } = require('../services/helpers')

const monthBounds = (year, month) => ({
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
})

const pctChange = (now, before) => (before ? round((now - before) / before, 4) : null)

// ====== Get Owner Report (Template F, Days 11 and 23)
const getOwnerReport = async (req, res) => {
    try {
        const property = await resolveProperty(req)
        if (!property) return res.status(404).send({ success: false, message: 'Property not found' })

        // Default = last full month
        const now = new Date()
        let [year, month] = [now.getUTCFullYear(), now.getUTCMonth() - 1]
        if (req.query.month) {
            const [y, m] = req.query.month.split('-').map(Number)
            if (!y || !m) return res.status(400).send({ success: false, message: 'Month must look like 2026-09' })
            year = y
            month = m - 1
        }
        const { start, end } = monthBounds(year, month)
        year = start.getUTCFullYear()
        month = start.getUTCMonth()
        const prev = monthBounds(year, month - 1)
        const next = monthBounds(year, month + 1)

        const reservations = await reservationSchema.find({ property: property._id, checkOut: { $gt: prev.start }, checkIn: { $lt: end } })
        const current = calcKpis(reservations, [property], start, end)
        const previous = calcKpis(reservations, [property], prev.start, prev.end)

        // ====== Guest feedback
        const reviews = await reviewSchema.find({ property: property._id, postedAt: { $gte: start, $lt: end } })
        const best = [...reviews].sort((a, b) => b.rating - a.rating)[0]
        const issues = reviews.filter((r) => r.rating <= 3)

        // ====== Operations
        const tickets = await ticketSchema.find({ property: property._id, $or: [{ closedAt: { $gte: start, $lt: end } }, { createdAt: { $gte: start, $lt: end } }] })
        const maintenanceCost = tickets.reduce((s, t) => s + (t.cost || 0), 0)

        // ====== Next month
        const nextEvents = await priceDaySchema.find({ property: property._id, date: { $gte: next.start, $lt: next.end }, event: { $ne: '' } })
        const openScreenings = await screeningSchema.countDocuments({ property: property._id, decision: { $in: ['pending', 'investigate'] } })

        const revenueChange = pctChange(current.totalRevenue, previous.totalRevenue)
        const hasMarket = !!property.marketOccupancy
        const occVsMarket = hasMarket ? current.occupancy - property.marketOccupancy : 0
        const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
        const headline = `${monthName}: $${Math.round(current.totalRevenue).toLocaleString('en-US')} revenue${revenueChange !== null ? ` (${revenueChange >= 0 ? '+' : ''}${Math.round(revenueChange * 100)}% vs last month)` : ''}, occupancy ${Math.round(current.occupancy * 100)}%${hasMarket ? `, ${occVsMarket >= 0 ? 'ahead of' : 'behind'} the local market by ${Math.abs(Math.round(occVsMarket * 100))} points` : ''}.`

        const total = Object.values(current.channelNights).reduce((s, n) => s + n, 0)
        return res.status(200).send({
            success: true,
            message: 'Owner report fetched.',
            data: {
                property,
                month: `${year}-${String(month + 1).padStart(2, '0')}`,
                monthName,
                headline,
                numbers: {
                    current,
                    previous,
                    market: hasMarket ? { occupancy: property.marketOccupancy, adr: property.marketAdr, revpar: round(property.marketOccupancy * property.marketAdr) } : null,
                },
                bookings: {
                    stays: current.stays,
                    avgLengthOfStay: current.avgLengthOfStay,
                    channelSplit: Object.entries(current.channelNights).map(([channel, nights]) => ({ channel, nights, share: round(nights / (total || 1), 4) })),
                },
                feedback: {
                    count: reviews.length,
                    avgRating: reviews.length ? round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, 2) : null,
                    bestQuote: best && best.rating >= 4 ? best.text : '',
                    issues: issues.map((r) => ({ text: r.text, fixed: !!r.reply, reply: r.reply })),
                },
                operations: {
                    turnovers: current.turnovers,
                    maintenance: tickets.map((t) => ({ issue: t.issue, status: t.status, cost: t.cost })),
                    costs: {
                        otaFees: current.otaFees,
                        cleaning: current.cleaningCost,
                        software: current.softwareCost,
                        maintenance: maintenanceCost,
                    },
                    hostNetAfterMaintenance: round(current.hostNet - maintenanceCost),
                },
                nextMonth: {
                    events: [...new Set(nextEvents.map((e) => e.event))],
                    pricingPlan: nextEvents.length
                        ? 'Raise rates and set a 2-3 night minimum on event dates; keep weekdays competitive.'
                        : 'Hold base price; review weekly against 3 nearby listings.',
                    ownerDecisions: [
                        ...(openScreenings ? [`${openScreenings} upcoming booking(s) need a screening decision`] : []),
                        ...(property.audit?.missingAmenities?.length ? [`Approve adding: ${property.audit.missingAmenities.join(', ')}`] : []),
                    ],
                },
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getOwnerReport }
