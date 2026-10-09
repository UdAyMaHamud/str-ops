const propertySchema = require('../models/propertySchema')
const reservationSchema = require('../models/reservationSchema')
const threadSchema = require('../models/threadSchema')
const draftSchema = require('../models/draftSchema')
const turnoverSchema = require('../models/turnoverSchema')
const alertSchema = require('../models/alertSchema')
const screeningSchema = require('../models/screeningSchema')
const claimSchema = require('../models/claimSchema')
const ticketSchema = require('../models/ticketSchema')
const integrationSchema = require('../models/integrationSchema')
const { calcKpis, nightsInRange } = require('../services/metrics')
const { integrationHealth } = require('../services/health')
const { DAY, dayOffset, round, propertyFilter } = require('../services/helpers')

// ====== Get Overview (KPIs, trend, today, needs attention)
const getOverview = async (req, res) => {
    try {
        const days = Math.min(Number(req.query.days) || 30, 60)
        const filter = propertyFilter(req)
        const propertyQuery = filter.property ? { _id: filter.property } : {}

        const properties = await propertySchema.find(propertyQuery)
        const reservations = await reservationSchema.find({ ...filter, checkOut: { $gt: dayOffset(-2 * days) }, checkIn: { $lt: dayOffset(1) } })

        const start = dayOffset(-days)
        const end = dayOffset(0)
        const current = calcKpis(reservations, properties, start, end)
        const previous = calcKpis(reservations, properties, dayOffset(-2 * days), start)

        // ====== Daily trend (room revenue + occupancy per night)
        const trend = []
        for (let d = -days; d < 0; d++) {
            const dayStart = dayOffset(d)
            const dayEnd = dayOffset(d + 1)
            let revenue = 0
            let booked = 0
            for (const r of reservations) {
                if (r.type !== 'guest' || r.status === 'cancelled') continue
                if (nightsInRange(r, dayStart, dayEnd)) {
                    revenue += r.roomRevenue / r.nights
                    booked += 1
                }
            }
            trend.push({ date: dayStart, revenue: round(revenue), occupancy: round(booked / (properties.length || 1), 4) })
        }

        // ====== Per-property table
        const byProperty = properties.map((p) => {
            const own = reservations.filter((r) => String(r.property) === String(p._id))
            const kpis = calcKpis(own, [p], start, end)
            return {
                _id: p._id, code: p.code, name: p.name, city: p.city, state: p.state, tier: p.tier,
                occupancy: kpis.occupancy, adr: kpis.adr, revpar: kpis.revpar, totalRevenue: kpis.totalRevenue, hostNet: kpis.hostNet,
                market: kpis.market,
            }
        })

        // ====== Today / next 24 hours (morning check, Day 22)
        const today = dayOffset(0)
        const tomorrow = dayOffset(1)
        const todayStays = await reservationSchema
            .find({ ...filter, type: 'guest', status: 'confirmed', $or: [{ checkIn: { $gte: today, $lte: tomorrow } }, { checkOut: { $gte: today, $lte: tomorrow } }] })
            .populate('property', 'code name timezone')
        const checkIns = todayStays.filter((r) => r.checkIn >= today && r.checkIn <= tomorrow)
        const checkOuts = todayStays.filter((r) => r.checkOut >= today && r.checkOut <= tomorrow)
        const inHouse = await reservationSchema.countDocuments({ ...filter, type: 'guest', status: 'confirmed', checkIn: { $lt: today }, checkOut: { $gt: today } })
        const turnoversToday = await turnoverSchema
            .find({ ...filter, scheduledFor: { $gte: today, $lt: new Date(today.getTime() + 2 * DAY) } })
            .populate('property', 'code name timezone')
            .sort({ scheduledFor: 1 })
        const openAlerts = await alertSchema.find({ ...filter, status: { $ne: 'resolved' } }).populate('property', 'code name').sort({ raisedAt: -1 })

        // ====== Needs attention (normal vs worried rules, Day 15)
        const signals = []
        const waitingThreads = await threadSchema.find({ ...filter, needsReply: true })
        const overdue = waitingThreads.filter((t) => Date.now() - new Date(t.messages[t.messages.length - 1]?.sentAt) > 60 * 60000)
        if (overdue.length) signals.push({ level: 'critical', title: `${overdue.length} guest message(s) waiting over 60 min`, detail: 'Response time standard is under 60 minutes.', link: '/inbox' })
        else if (waitingThreads.length) signals.push({ level: 'warning', title: `${waitingThreads.length} guest message(s) waiting`, detail: 'All within the 60 minute standard so far.', link: '/inbox' })

        const criticalAlerts = openAlerts.filter((a) => a.severity === 'critical')
        if (criticalAlerts.length) signals.push({ level: 'critical', title: `${criticalAlerts.length} critical smart-home alert(s)`, detail: criticalAlerts.map((a) => `${a.property?.code}: ${a.type}`).join(', '), link: '/smart-home' })

        const integrations = await integrationSchema.find()
        const failing = integrations.map((i) => ({ name: i.name, ...integrationHealth(i) })).filter((i) => i.level !== 'good')
        failing.forEach((i) => signals.push({ level: i.level, title: `${i.name}: ${i.summary}`, detail: i.statusMeaning, link: '/integrations' }))

        const urgentTickets = await ticketSchema.countDocuments({ ...filter, status: { $ne: 'closed' }, urgency: { $in: ['urgent', 'high'] } })
        if (urgentTickets) signals.push({ level: 'warning', title: `${urgentTickets} urgent/high maintenance ticket(s) open`, detail: 'Guest-impacting issues need an update every few hours.', link: '/maintenance' })

        const claims = await claimSchema.find({ ...filter, status: 'open' })
        claims.forEach((c) => {
            const daysLeft = Math.ceil((new Date(c.deadline) - Date.now()) / DAY)
            if (daysLeft <= 10) signals.push({ level: daysLeft <= 3 ? 'critical' : 'warning', title: `Damage claim ${c.reservationCode}: ${daysLeft} day(s) to file`, detail: 'Missed platform deadline = no payout.', link: '/reviews' })
        })

        const pendingScreening = await screeningSchema.countDocuments({ ...filter, decision: { $in: ['pending', 'investigate'] }, checkIn: { $lte: dayOffset(7) } })
        if (pendingScreening) signals.push({ level: 'warning', title: `${pendingScreening} screening decision(s) open, arriving within 7 days`, detail: 'Give the owner a clear recommendation.', link: '/screening' })

        const qcPending = turnoversToday.filter((t) => t.status === 'done' && t.qcStatus === 'pending').length
        if (qcPending) signals.push({ level: 'warning', title: `${qcPending} turnover(s) waiting for photo QC`, detail: 'Approve or reject before the next check-in.', link: '/turnovers' })

        const lowSupplies = turnoversToday.filter((t) => t.supplies.some((s) => s.level < s.par)).length
        if (lowSupplies) signals.push({ level: 'warning', title: `Low supplies at ${lowSupplies} upcoming turnover(s)`, detail: 'Send a restock request to the cleaner.', link: '/turnovers' })

        const pendingDrafts = await draftSchema.countDocuments({ ...filter, status: 'pending' })
        if (pendingDrafts) signals.push({ level: 'warning', title: `${pendingDrafts} draft(s) waiting for senior approval`, detail: 'Draft, do not send.', link: '/inbox' })

        const lastBooking = await reservationSchema.findOne({ ...filter, type: 'guest' }).sort({ bookedAt: -1 })
        const hoursSinceBooking = lastBooking ? round((Date.now() - lastBooking.bookedAt) / 3600000, 1) : null
        if (properties.length && (hoursSinceBooking === null || hoursSinceBooking > 48))
            signals.push({ level: 'critical', title: 'No new booking in 48 hours', detail: 'Check the PMS webhook and channel sync first.', link: '/integrations' })

        // Clients see owner-relevant signals only, never internal tools
        const isClient = req.user.role === 'client'
        const STAFF_LINKS = ['/integrations', '/inbox', '/screening']
        const visibleSignals = isClient ? signals.filter((s) => !STAFF_LINKS.includes(s.link)) : signals

        // ====== Cost breakdown (where the money goes)
        const closedTickets = await ticketSchema.find({ ...filter, closedAt: { $gte: start, $lt: end } })
        const maintenanceCost = closedTickets.reduce((s, t) => s + (t.cost || 0), 0)
        const costBreakdown = [
            { name: 'OTA & payment fees', value: current.otaFees },
            { name: 'Cleaning', value: current.cleaningCost },
            { name: 'Maintenance', value: round(maintenanceCost) },
            { name: 'Software', value: current.softwareCost },
        ]

        // ====== Latest bookings + open maintenance (dashboard lists)
        const recentBookings = await reservationSchema
            .find({ ...filter, type: 'guest' })
            .populate('property', 'code name city state image')
            .sort({ bookedAt: -1 })
            .limit(6)
        const openTickets = await ticketSchema
            .find({ ...filter, status: { $ne: 'closed' } })
            .populate('property', 'code name')
            .sort({ createdAt: -1 })
            .limit(5)

        return res.status(200).send({
            success: true,
            message: 'Overview fetched.',
            data: {
                period: { days, start, end },
                current,
                previous,
                trend,
                byProperty,
                today: {
                    checkIns,
                    checkOuts,
                    inHouse,
                    turnovers: turnoversToday,
                    openAlerts,
                    lastBookingAt: lastBooking?.bookedAt,
                },
                costBreakdown,
                recentBookings: recentBookings.map((r) => ({
                    _id: r._id, code: r.code, guestFirstName: r.guestFirstName, channel: r.channel, status: r.status,
                    checkIn: r.checkIn, checkOut: r.checkOut, nights: r.nights, bookedAt: r.bookedAt,
                    amount: round(r.roomRevenue + r.cleaningFee), property: r.property,
                })),
                openTickets,
                signals: visibleSignals.sort((a, b) => (a.level === 'critical' ? -1 : 1) - (b.level === 'critical' ? -1 : 1)),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getOverview }
