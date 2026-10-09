const userSchema = require('../models/userSchema')
const propertySchema = require('../models/propertySchema')
const reservationSchema = require('../models/reservationSchema')
const threadSchema = require('../models/threadSchema')
const draftSchema = require('../models/draftSchema')
const turnoverSchema = require('../models/turnoverSchema')
const alertSchema = require('../models/alertSchema')
const screeningSchema = require('../models/screeningSchema')
const reviewSchema = require('../models/reviewSchema')
const claimSchema = require('../models/claimSchema')
const ticketSchema = require('../models/ticketSchema')
const priceDaySchema = require('../models/priceDaySchema')
const escalationSchema = require('../models/escalationSchema')
const integrationSchema = require('../models/integrationSchema')
const workflowRunSchema = require('../models/workflowRunSchema')
const eodSchema = require('../models/eodSchema')
const { calcKpis } = require('../services/metrics')
const { integrationHealth } = require('../services/health')
const { getProgress } = require('../services/trainingPlan')
const { buildTeam } = require('../services/team')
const { DAY, dayOffset, startOfToday, round, propertyFilter } = require('../services/helpers')

const minutesWaiting = (thread) => Math.round((Date.now() - new Date(thread.messages[thread.messages.length - 1]?.sentAt)) / 60000)

// ====== Today's movements, shared by the staff homes
const todayCounts = async () => {
    const today = dayOffset(0)
    const tomorrow = dayOffset(1)
    const [checkIns, checkOuts, turnovers, openAlerts] = await Promise.all([
        reservationSchema.countDocuments({ type: 'guest', status: 'confirmed', checkIn: { $gte: today, $lt: tomorrow } }),
        reservationSchema.countDocuments({ type: 'guest', status: 'confirmed', checkOut: { $gte: today, $lt: tomorrow } }),
        turnoverSchema.countDocuments({ scheduledFor: { $gte: today, $lt: tomorrow } }),
        alertSchema.countDocuments({ status: { $ne: 'resolved' } }),
    ])
    return { checkIns, checkOuts, turnovers, openAlerts }
}

// ====== Owner home: earnings, calendar, upcoming stays, decisions
const getOwnerHome = async (req, res) => {
    try {
        const filter = propertyFilter(req)
        const properties = await propertySchema.find(filter.property ? { _id: filter.property } : {}).sort({ code: 1 })
        const ids = properties.map((p) => p._id)
        const owned = { property: { $in: ids } }

        const now = new Date()
        const today = startOfToday()
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
        const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))

        const reservations = await reservationSchema
            .find({ ...owned, checkOut: { $gt: lastMonthStart }, checkIn: { $lt: dayOffset(31) } })
            .populate('property', 'code name image cleaningCost')
        const monthToDate = calcKpis(reservations, properties, monthStart, today)
        const onTheBooks = calcKpis(reservations, properties, today, nextMonth)
        const lastMonth = calcKpis(reservations, properties, lastMonthStart, monthStart)
        const next30 = calcKpis(reservations, properties, today, dayOffset(30))

        // ====== Next 14 nights per property
        const calendar = properties.map((p) => {
            const own = reservations.filter((r) => String(r.property?._id) === String(p._id) && r.status === 'confirmed')
            const nights = []
            for (let d = 0; d < 14; d++) {
                const date = dayOffset(d)
                const stay = own.find((r) => new Date(r.checkIn) <= date && new Date(r.checkOut) > date)
                nights.push({
                    date,
                    state: !stay ? 'open' : stay.type === 'owner_block' ? 'owner' : 'guest',
                    arrival: !!stay && new Date(stay.checkIn).getTime() === date.getTime(),
                    code: stay?.code || '',
                })
            }
            return { _id: p._id, code: p.code, name: p.name, image: p.image, nights }
        })

        // ====== Upcoming stays (guest first name + code only)
        const upcomingStays = reservations
            .filter((r) => r.type === 'guest' && r.status === 'confirmed' && new Date(r.checkIn) >= today && new Date(r.checkIn) < dayOffset(30))
            .sort((a, b) => a.checkIn - b.checkIn)
            .slice(0, 8)
            .map((r) => ({
                _id: r._id, code: r.code, guestFirstName: r.guestFirstName, channel: r.channel, guests: r.guests,
                checkIn: r.checkIn, checkOut: r.checkOut, nights: r.nights,
                property: { code: r.property?.code, name: r.property?.name, image: r.property?.image },
                payout: round(r.roomRevenue + r.cleaningFee - r.otaFee - (r.property?.cleaningCost || 0)),
            }))

        // ====== Decisions the owner has to make (workbook: "anything the owner must decide")
        const decisions = []
        const requests = await reservationSchema.find({ ...owned, status: 'pending' }).populate('property', 'name')
        requests.forEach((r) =>
            decisions.push({
                level: 'info',
                title: `New booking request at ${r.property?.name}: ${r.nights} nights`,
                detail: `${r.guestFirstName} · arrives ${new Date(r.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · our team confirms within 24 hours`,
                link: '',
            })
        )
        const screenings = await screeningSchema.find({ ...owned, decision: { $in: ['investigate', 'decline'] }, checkIn: { $gte: today } }).populate('property', 'code name')
        screenings.forEach((s) =>
            decisions.push({
                level: s.decision === 'decline' ? 'critical' : 'warning',
                title: `${s.decision === 'decline' ? 'We recommend declining' : 'We are checking'} booking ${s.reservationCode}`,
                detail: `${s.property?.name} · arrives ${new Date(s.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · ${s.reason || 'Review in progress'}`,
                link: '',
            })
        )
        const priceDays = await priceDaySchema.find({ ...owned, date: { $gte: today, $lt: dayOffset(60) } })
        properties.forEach((p) => {
            const own = reservations.filter((r) => String(r.property?._id) === String(p._id) && r.status === 'confirmed')
            const outOfRange = priceDays.filter((d) => {
                if (String(d.property) !== String(p._id)) return false
                const booked = own.some((r) => new Date(r.checkIn) <= d.date && new Date(r.checkOut) > d.date)
                return !booked && (d.currentPrice < p.minPrice || d.currentPrice > p.maxPrice)
            })
            if (outOfRange.length)
                decisions.push({ level: 'warning', title: `${outOfRange.length} night(s) at ${p.name} priced outside your $${p.minPrice}-$${p.maxPrice} range`, detail: 'Confirm the price or adjust your limits.', link: '/pricing' })
            if ((p.audit?.scores || []).length < 8)
                decisions.push({ level: 'info', title: `${p.name}: listing audit in progress`, detail: 'Our team scores the listing before it goes live on the site.', link: '/listings' })
            else if (p.audit?.missingAmenities?.length)
                decisions.push({ level: 'info', title: `Approve adding amenities at ${p.name}`, detail: p.audit.missingAmenities.join(', '), link: '/listings' })
        })
        const claims = await claimSchema.find({ ...owned, status: 'open' }).populate('property', 'name')
        claims.forEach((c) =>
            decisions.push({
                level: 'warning',
                title: `Damage claim at ${c.property?.name}: $${c.amount}`,
                detail: `Filing deadline ${new Date(c.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}. We are building the evidence pack.`,
                link: '/reviews',
            })
        )

        // ====== Guest reviews
        const reviews = await reviewSchema.find(owned).populate('property', 'code name').sort({ postedAt: -1 })

        return res.status(200).send({
            success: true,
            message: 'Owner home fetched.',
            data: {
                properties: properties.length,
                earnings: {
                    monthToDate: monthToDate.hostNet,
                    onTheBooks: onTheBooks.hostNet,
                    projected: round(monthToDate.hostNet + onTheBooks.hostNet),
                    lastMonth: lastMonth.hostNet,
                    monthName: monthStart.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
                },
                next30: { occupancy: next30.occupancy, bookedNights: next30.bookedNights, availableNights: next30.availableNights },
                calendar,
                upcomingStays,
                decisions,
                reviews: {
                    avgRating: reviews.length ? round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, 1) : null,
                    count: reviews.length,
                    latest: reviews.slice(0, 3),
                },
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Trainee home: day card, shift queue, my drafts, my reports
const getTraineeHome = async (req, res) => {
    try {
        const me = req.user._id
        const progress = getProgress(req.user)
        const todayEod = await eodSchema.findOne({ user: me, date: startOfToday() })
        const eodCount = await eodSchema.countDocuments({ user: me })

        // ====== My drafts (Day 20 Draft Log)
        const myDrafts = await draftSchema.find({ author: me }).populate('property', 'code name').populate('reviewer', 'fullName').sort({ createdAt: -1 })
        const reviewed = myDrafts.filter((d) => d.status !== 'pending')
        const ok = reviewed.filter((d) => ['approved', 'edited'].includes(d.status)).length
        // Rejected drafts I have not rewritten yet
        const needsRewrite = myDrafts.filter(
            (d) => d.status === 'rejected' && !myDrafts.some((n) => String(n.thread) === String(d.thread) && n.createdAt > d.createdAt)
        )

        // ====== Shift queue: guests waiting with no draft in review yet
        const pendingThreads = (await draftSchema.find({ status: 'pending' }).select('thread')).map((d) => String(d.thread))
        const waiting = await threadSchema.find({ needsReply: true }).populate('property', 'code name')
        const shiftQueue = waiting
            .filter((t) => !pendingThreads.includes(String(t._id)))
            .map((t) => ({
                _id: t._id, reservationCode: t.reservationCode, stage: t.stage, escalate: t.escalate,
                property: t.property, waitMin: minutesWaiting(t), lastMessage: t.messages[t.messages.length - 1]?.body,
            }))
            .sort((a, b) => b.waitMin - a.waitMin)

        const myEscalations = await escalationSchema.find({ createdBy: me }).populate('property', 'code name').sort({ createdAt: -1 }).limit(4)

        return res.status(200).send({
            success: true,
            message: 'Trainee home fetched.',
            data: {
                progress,
                eod: { submittedToday: !!todayEod, count: eodCount, today: todayEod },
                drafts: {
                    pending: myDrafts.length - reviewed.length,
                    approved: reviewed.filter((d) => d.status === 'approved').length,
                    edited: reviewed.filter((d) => d.status === 'edited').length,
                    rejected: reviewed.filter((d) => d.status === 'rejected').length,
                    approvalRate: reviewed.length ? round(ok / reviewed.length, 4) : null,
                    recent: myDrafts.slice(0, 4),
                    needsRewrite,
                },
                shiftQueue,
                myEscalations,
                today: await todayCounts(),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Senior home: everything waiting for a senior decision + the team
const getSeniorHome = async (req, res) => {
    try {
        const [bookingRequests, pendingDrafts, qcPending, openEscalations, screeningsDue, criticalAlerts, integrations, eodsToday, team] = await Promise.all([
            reservationSchema.find({ status: 'pending' }).populate('property', 'code name').sort({ bookedAt: 1 }),
            draftSchema.find({ status: 'pending' }).populate('author', 'fullName').populate('property', 'code name').sort({ createdAt: 1 }),
            turnoverSchema.find({ status: 'done', qcStatus: 'pending' }).populate('property', 'code name'),
            escalationSchema.find({ status: 'open' }).populate('property', 'code name').populate('createdBy', 'fullName').sort({ createdAt: 1 }),
            screeningSchema.find({ decision: { $in: ['pending', 'investigate'] }, checkIn: { $lte: dayOffset(7) } }).populate('property', 'code name').sort({ checkIn: 1 }),
            alertSchema.find({ status: 'open', severity: 'critical' }).populate('property', 'code name'),
            integrationSchema.find(),
            eodSchema.find({ date: startOfToday() }).populate('user', 'fullName'),
            buildTeam(),
        ])
        const failingIntegrations = integrations.map((i) => ({ _id: i._id, name: i.name, lastStatus: i.lastStatus, ...integrationHealth(i) })).filter((i) => i.level !== 'good')

        return res.status(200).send({
            success: true,
            message: 'Senior home fetched.',
            data: {
                queue: {
                    total: bookingRequests.length + pendingDrafts.length + qcPending.length + openEscalations.length + screeningsDue.length,
                    bookingRequests: bookingRequests.map((b) => ({
                        _id: b._id, code: b.code, guestFirstName: b.guestFirstName, property: b.property, checkIn: b.checkIn, checkOut: b.checkOut,
                        nights: b.nights, guests: b.guests, total: round(b.roomRevenue + b.cleaningFee), bookedAt: b.bookedAt,
                    })),
                    pendingDrafts,
                    qcPending,
                    openEscalations,
                    screeningsDue,
                },
                criticalAlerts,
                failingIntegrations,
                team,
                eodsToday,
                today: await todayCounts(),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Admin home: platform, people, listings, system health
const getAdminHome = async (req, res) => {
    try {
        const [users, properties, integrations, workflowErrors] = await Promise.all([
            userSchema.find().select('fullName email role authProvider isVerified createdAt').sort({ createdAt: -1 }),
            propertySchema.find().populate('owner', 'fullName email').sort({ code: 1 }),
            integrationSchema.find(),
            workflowRunSchema.countDocuments({ status: 'error', startedAt: { $gte: new Date(Date.now() - 7 * DAY) } }),
        ])
        const reservations = await reservationSchema.find({ checkOut: { $gt: dayOffset(-60) }, checkIn: { $lt: dayOffset(1) } })
        const portfolio = calcKpis(reservations, properties, dayOffset(-30), dayOffset(0))
        const previous = calcKpis(reservations, properties, dayOffset(-60), dayOffset(-30))

        const roles = { guest: 0, client: 0, trainee: 0, senior: 0, admin: 0 }
        users.forEach((u) => (roles[u.role] = (roles[u.role] || 0) + 1))

        // ====== Owners with their properties and last-30-day numbers
        const owners = users
            .filter((u) => u.role === 'client')
            .map((u) => {
                const own = properties.filter((p) => String(p.owner?._id) === String(u._id))
                const kpis = own.length
                    ? calcKpis(reservations.filter((r) => own.some((p) => String(p._id) === String(r.property))), own, dayOffset(-30), dayOffset(0))
                    : null
                return {
                    _id: u._id, fullName: u.fullName, email: u.email, authProvider: u.authProvider, isVerified: u.isVerified, createdAt: u.createdAt,
                    properties: own.map((p) => p.code),
                    revenue: kpis?.totalRevenue || 0,
                    occupancy: kpis?.occupancy || 0,
                }
            })

        const health = { good: 0, warning: 0, critical: 0 }
        integrations.forEach((i) => (health[integrationHealth(i).level] += 1))

        return res.status(200).send({
            success: true,
            message: 'Admin home fetched.',
            data: {
                portfolio,
                previous,
                roles,
                totalUsers: users.length,
                unverified: users.filter((u) => !u.isVerified).length,
                recentUsers: users.slice(0, 6),
                owners,
                auditQueue: properties.filter((p) => (p.audit?.scores || []).length < 8),
                propertyCount: properties.length,
                system: { ...health, total: integrations.length, workflowErrors },
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getOwnerHome, getTraineeHome, getSeniorHome, getAdminHome }
