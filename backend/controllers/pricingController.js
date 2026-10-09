const priceDaySchema = require('../models/priceDaySchema')
const reservationSchema = require('../models/reservationSchema')
const { DAY, dayOffset, round, resolveProperty } = require('../services/helpers')

// ====== Get Pricing (60-day calendar + weekly pricing review, Day 7)
const getPricing = async (req, res) => {
    try {
        const property = await resolveProperty(req)
        if (!property) return res.status(404).send({ success: false, message: 'Property not found' })

        const priceDays = await priceDaySchema.find({ property: property._id }).sort({ date: 1 })
        const reservations = await reservationSchema.find({
            property: property._id,
            status: 'confirmed',
            checkOut: { $gt: dayOffset(-1) },
            checkIn: { $lt: dayOffset(61) },
        })

        // Which reservation covers a given date
        const coveredBy = (date) =>
            reservations.find((r) => new Date(r.checkIn) <= date && new Date(r.checkOut) > date)

        const days = priceDays.map((p, i) => {
            const date = new Date(p.date)
            const booking = coveredBy(date)
            const before = coveredBy(new Date(date.getTime() - DAY))
            const after = coveredBy(new Date(date.getTime() + DAY))
            const gapNight = !booking && !!before && !!after
            let suggestedPrice = p.suggestedPrice
            let minStay = p.minStay
            let note = p.event ? `Event: ${p.event}` : ''
            if (gapNight && p.event) {
                // Event demand beats the gap discount: keep the event rate, just allow 1 night
                minStay = 1
                note = 'Gap night on an event date: keep the event rate, allow a 1-night stay'
            } else if (gapNight) {
                suggestedPrice = Math.max(property.minPrice, Math.round(p.currentPrice * 0.85))
                minStay = 1
                note = 'Gap night: allow 1-night stay at about -15%'
            }
            return {
                index: i,
                date,
                currentPrice: p.currentPrice,
                suggestedPrice,
                changePct: round((suggestedPrice - p.currentPrice) / p.currentPrice, 4),
                minStay,
                event: p.event,
                note,
                booked: !!booking,
                bookingType: booking?.type || '',
                reservationCode: booking?.code || '',
                gapNight,
                // Only open nights can still be fixed
                belowMin: !booking && p.currentPrice < property.minPrice,
                aboveMax: !booking && p.currentPrice > property.maxPrice,
            }
        })

        const changed = days.filter((d) => !d.booked && d.suggestedPrice !== d.currentPrice)
        const ups = changed.filter((d) => d.suggestedPrice > d.currentPrice)
        const downs = changed.filter((d) => d.suggestedPrice < d.currentPrice)
        const gaps = days.filter((d) => d.gapNight)
        const outOfRange = days.filter((d) => d.belowMin || d.aboveMax)
        const eventNames = [...new Set(days.filter((d) => d.event && !d.booked).map((d) => d.event))]
        const upside = ups.reduce((s, d) => s + (d.suggestedPrice - d.currentPrice), 0)
        const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

        // ====== 5-line owner summary (Template A)
        const ownerSummary = [
            `Changed: ${changed.length} open nights adjusted (${ups.length} up, ${downs.length} down) for the next 60 days.`,
            `Why: ${eventNames.length ? eventNames.join(', ') : 'no major events'}${downs.length ? '; lower prices on hard-to-sell nights' : ''}.`,
            `Expected effect: about +$${Math.round(upside)} if event nights book at the new rates; cuts aim to lift occupancy.`,
            `Gap nights found: ${gaps.length}${gaps.length ? ` (${gaps.map((g) => fmtDate(g.date)).join(', ')}), set to a 1-night minimum` : ''}.`,
            `Owner decision: ${outOfRange.length ? `${outOfRange.length} night(s) currently outside your $${property.minPrice}-$${property.maxPrice} range (${outOfRange.map((d) => fmtDate(d.date)).join(', ')}). Please confirm or adjust.` : 'nothing needed this week.'}`,
        ]

        return res.status(200).send({
            success: true,
            message: 'Pricing fetched.',
            data: {
                property,
                days,
                summary: {
                    bookedPct: round(days.filter((d) => d.booked).length / (days.length || 1), 4),
                    gapNights: gaps.length,
                    outOfRange: outOfRange.length,
                    changes: changed.length,
                    avgCurrent: round(days.reduce((s, d) => s + d.currentPrice, 0) / (days.length || 1)),
                },
                ownerSummary,
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getPricing }
