// Mock data for the staging dashboard: a 4-property portfolio (capstone, Day 22).
// All dates are relative to "today" so the dashboard always looks live.
// Guest PII rule: reservation codes and first names only.

const userSchema = require('../models/userSchema')
const propertySchema = require('../models/propertySchema')
const reservationSchema = require('../models/reservationSchema')
const threadSchema = require('../models/threadSchema')
const draftSchema = require('../models/draftSchema')
const turnoverSchema = require('../models/turnoverSchema')
const alertSchema = require('../models/alertSchema')
const priceDaySchema = require('../models/priceDaySchema')
const screeningSchema = require('../models/screeningSchema')
const reviewSchema = require('../models/reviewSchema')
const claimSchema = require('../models/claimSchema')
const ticketSchema = require('../models/ticketSchema')
const integrationSchema = require('../models/integrationSchema')
const workflowRunSchema = require('../models/workflowRunSchema')
const escalationSchema = require('../models/escalationSchema')
const contactSchema = require('../models/contactSchema')
const { DAY, dayOffset, minutesAgo, round } = require('./helpers')
const { isTrainingDay } = require('./trainingPlan')
const eodSchema = require('../models/eodSchema')

// ====== Deterministic random so every seed looks the same
let seedValue = 1
const rand = () => {
    seedValue = (seedValue * 1664525 + 1013904223) % 4294967296
    return seedValue / 4294967296
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const at = (offset, hour, minute = 0) => new Date(dayOffset(offset).getTime() + (hour * 60 + minute) * 60 * 1000)

const FIRST_NAMES = ['Emily', 'James', 'Sofia', 'Michael', 'Ava', 'Daniel', 'Olivia', 'Ethan', 'Mia', 'Noah',
    'Grace', 'Lucas', 'Chloe', 'Ryan', 'Harper', 'Jack', 'Zoe', 'Owen', 'Lily', 'Caleb', 'Nora', 'Leo']
const FEE_RATE = { Airbnb: 0.155, VRBO: 0.08, 'Booking.com': 0.15, Direct: 0.03 }
const CHANNEL_WEIGHT = { Airbnb: 55, VRBO: 22, 'Booking.com': 15, Direct: 8 }

// ====== Properties
const PROPERTIES = [
    {
        code: 'P1', name: 'Lakeview Loft', city: 'Austin', state: 'TX', timezone: 'America/Chicago', bedrooms: 2,
        tier: 'Growth', channels: ['Airbnb', 'VRBO', 'Direct'], basePrice: 189, minPrice: 129, maxPrice: 420,
        cleaningFee: 95, cleaningCost: 70, softwareCost: 45, marketOccupancy: 0.68, marketAdr: 182,
        audit: { scores: [2, 2, 1, 2, 1, 2, 2, 2], missingAmenities: ['Dedicated workspace', 'Wifi speed (Mbps)'] },
        gap: [0, 2],
    },
    {
        code: 'P2', name: 'Palm Court Bungalow', city: 'Scottsdale', state: 'AZ', timezone: 'America/Phoenix', bedrooms: 3,
        tier: 'Pro', channels: ['Airbnb', 'VRBO', 'Booking.com'], basePrice: 245, minPrice: 160, maxPrice: 520,
        cleaningFee: 130, cleaningCost: 95, softwareCost: 60, marketOccupancy: 0.62, marketAdr: 236,
        audit: { scores: [2, 1, 2, 2, 2, 1, 2, 1], missingAmenities: ['Pool heating (seasonal)'] },
        gap: [0, 3],
    },
    {
        code: 'P3', name: 'Harbor Street Flat', city: 'Charleston', state: 'SC', timezone: 'America/New_York', bedrooms: 1,
        tier: 'Starter', channels: ['Airbnb', 'Booking.com', 'Direct'], basePrice: 159, minPrice: 110, maxPrice: 340,
        cleaningFee: 80, cleaningCost: 60, softwareCost: 30, marketOccupancy: 0.71, marketAdr: 165,
        audit: { scores: [1, 2, 2, 1, 2, 2, 1, 2], missingAmenities: ['Free street parking', 'Washer'] },
        gap: [0, 2],
    },
    {
        code: 'P4', name: 'Pine Ridge Cabin', city: 'Gatlinburg', state: 'TN', timezone: 'America/New_York', bedrooms: 2,
        tier: 'Growth', channels: ['Airbnb', 'VRBO', 'Direct'], basePrice: 229, minPrice: 140, maxPrice: 480,
        cleaningFee: 110, cleaningCost: 80, softwareCost: 45, marketOccupancy: 0.64, marketAdr: 205,
        audit: { scores: [1, 0, 1, 1, 1, 2, 1, 0], missingAmenities: ['Hot tub', 'Fire pit', 'EV charger', 'Mountain view'] },
        gap: [2, 7],
        stay: [2, 3],
    },
]

// Fixed stays around today so the "Today" panel always has work: [checkIn, checkOut, channel]
const ANCHORS = {
    P1: [[-3, 0, 'Airbnb'], [0, 4, 'VRBO']],
    P2: [[-2, 1, 'Airbnb']],
    P3: [[-6, -2, 'Booking.com'], [0, 3, 'Airbnb']],
    P4: [[-5, 0, 'Airbnb'], [1, 4, 'Direct']],
}

const usedCodes = new Set()
const makeCode = (channel) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const part = (n) => Array.from({ length: n }, () => chars[Math.floor(rand() * chars.length)]).join('')
    let code = ''
    do {
        if (channel === 'Airbnb') code = 'HM' + part(8)
        else if (channel === 'VRBO') code = 'HA-' + part(6)
        else if (channel === 'Booking.com') code = 'BK' + randInt(10000000, 99999999)
        else if (channel === 'Direct') code = 'DB-' + part(5)
        else code = 'OWN-' + part(4)
    } while (usedCodes.has(code))
    usedCodes.add(code)
    return code
}

const pickChannel = (channels) => {
    const total = channels.reduce((s, c) => s + CHANNEL_WEIGHT[c], 0)
    let roll = rand() * total
    for (const c of channels) {
        roll -= CHANNEL_WEIGHT[c]
        if (roll <= 0) return c
    }
    return channels[0]
}

// ====== Nightly price: weekend uplift + small noise
const nightlyPrice = (property, offset) => {
    const weekday = dayOffset(offset).getUTCDay()
    const weekend = weekday === 5 || weekday === 6 ? 1.22 : 1
    return Math.round(property.basePrice * weekend * (0.92 + rand() * 0.16))
}

const buildReservation = (property, checkIn, checkOut, channel, type = 'guest') => {
    const nights = checkOut - checkIn
    if (type === 'owner_block') {
        return {
            code: makeCode('Owner'), property: property._id, type, channel: 'Owner', guestFirstName: 'Owner stay',
            checkIn: dayOffset(checkIn), checkOut: dayOffset(checkOut), nights, guests: 0,
            bookedAt: new Date(dayOffset(checkIn).getTime() - 30 * DAY),
        }
    }
    let roomRevenue = 0
    for (let d = checkIn; d < checkOut; d++) roomRevenue += nightlyPrice(property, d)
    const cleaningFee = property.cleaningFee
    const leadDays = randInt(2, 50)
    // Bookings that would land in the future are spread over the last few days instead
    const planned = dayOffset(checkIn).getTime() - leadDays * DAY
    const bookedAt = new Date(planned < Date.now() - 6 * 3600 * 1000 ? planned : Date.now() - randInt(6, 120) * 3600 * 1000)
    return {
        code: makeCode(channel), property: property._id, type, channel, guestFirstName: pick(FIRST_NAMES),
        checkIn: dayOffset(checkIn), checkOut: dayOffset(checkOut), nights, guests: randInt(2, property.bedrooms * 2),
        nightlyRate: round(roomRevenue / nights), roomRevenue, cleaningFee,
        otaFee: round((roomRevenue + cleaningFee) * FEE_RATE[channel]),
        status: checkIn > 3 && rand() < 0.04 ? 'cancelled' : 'confirmed', bookedAt,
    }
}

// ====== Fill [from, to) with random stays
const fillStays = (property, from, to, list) => {
    let cursor = from
    while (cursor < to) {
        const { gap, stay = [2, 6] } = PROPERTIES.find((p) => p.code === property.code)
        cursor += randInt(gap[0], gap[1])
        let nights = randInt(stay[0], stay[1])
        if (cursor + nights > to) {
            if (to - cursor >= 2) nights = to - cursor
            else break
        }
        const isOwner = rand() < 0.05
        list.push(buildReservation(property, cursor, cursor + nights, pickChannel(property.channels), isOwner ? 'owner_block' : 'guest'))
        cursor += nights
    }
}

const buildReservations = (property) => {
    const list = []
    const anchors = ANCHORS[property.code]
    let cursor = -72
    for (const [checkIn, checkOut, channel] of anchors) {
        fillStays(property, cursor, checkIn, list)
        list.push(buildReservation(property, checkIn, checkOut, channel))
        cursor = checkOut
    }
    fillStays(property, cursor + 1, 64, list)
    return list
}

// ====== US holidays inside the pricing window
const holidaysBetween = (start, end) => {
    const list = []
    const years = [...new Set([start.getUTCFullYear(), end.getUTCFullYear()])]
    for (const y of years) {
        const nthWeekday = (month, weekday, n) => {
            const first = new Date(Date.UTC(y, month, 1)).getUTCDay()
            return new Date(Date.UTC(y, month, 1 + ((weekday - first + 7) % 7) + (n - 1) * 7))
        }
        const ipd = nthWeekday(9, 1, 2)
        const thanksgiving = nthWeekday(10, 4, 4)
        list.push({ date: new Date(ipd.getTime() - 2 * DAY), days: 3, name: "Indigenous Peoples' Day long weekend", pct: 0.12, minStay: 2 })
        list.push({ date: new Date(Date.UTC(y, 9, 31)), days: 1, name: 'Halloween', pct: 0.15, minStay: 2 })
        list.push({ date: new Date(thanksgiving.getTime() - DAY), days: 4, name: 'Thanksgiving', pct: 0.25, minStay: 3 })
        list.push({ date: new Date(Date.UTC(y, 11, 23)), days: 4, name: 'Christmas', pct: 0.3, minStay: 3 })
        list.push({ date: new Date(Date.UTC(y, 11, 30)), days: 2, name: "New Year's Eve", pct: 0.4, minStay: 3 })
    }
    return list.filter((h) => h.date >= start && h.date < end)
}

const CITY_EVENTS = {
    P1: [{ offset: 9, days: 3, name: 'Music festival weekend (mock)', pct: 0.35, minStay: 3 }],
    P2: [{ offset: 16, days: 3, name: 'Golf tournament (mock)', pct: 0.3, minStay: 3 }],
    P3: [{ offset: 23, days: 2, name: 'Food & wine weekend (mock)', pct: 0.25, minStay: 2 }],
    P4: [{ offset: 12, days: 3, name: 'Fall foliage peak (mock)', pct: 0.2, minStay: 2 }],
}

const buildPriceDays = (property) => {
    const start = dayOffset(0)
    const end = dayOffset(60)
    const eventByDay = {}
    for (const h of holidaysBetween(start, end)) {
        for (let i = 0; i < h.days; i++) eventByDay[Math.round((h.date - start) / DAY) + i] = h
    }
    for (const e of CITY_EVENTS[property.code]) {
        for (let i = 0; i < e.days; i++) eventByDay[e.offset + i] = e
    }

    const days = []
    for (let d = 0; d < 60; d++) {
        let currentPrice = nightlyPrice(property, d)
        const event = eventByDay[d]
        let suggestedPrice = currentPrice
        let minStay = 2
        if (event) {
            suggestedPrice = Math.min(property.maxPrice, Math.round(currentPrice * (1 + event.pct)))
            minStay = event.minStay
        } else if (property.code === 'P4' && d < 21) {
            // Underperforming cabin: suggest a weekday cut to win back occupancy
            const weekday = dayOffset(d).getUTCDay()
            if (weekday >= 0 && weekday <= 4) suggestedPrice = Math.round(currentPrice * 0.88)
        }
        // Deliberate sanity-check problems for trainees to catch
        if (property.code === 'P2' && d === 6) currentPrice = 149
        if (property.code === 'P1' && d === 33) currentPrice = 455
        days.push({ property: property._id, date: dayOffset(d), currentPrice, suggestedPrice, minStay, event: event?.name || '' })
    }
    return days
}

// ====== Training start date so that today is Day `day` (Fridays are days off)
const trainingStartFor = (day) => {
    let counted = 0
    let offset = 0
    while (counted < day - 1) {
        offset -= 1
        if (!isTrainingDay(dayOffset(offset))) continue
        counted += 1
    }
    return dayOffset(offset)
}

// The last `count` training days before today, oldest first
const pastTrainingDays = (count) => {
    const days = []
    let offset = 0
    while (days.length < count) {
        offset -= 1
        if (isTrainingDay(dayOffset(offset))) days.unshift(dayOffset(offset))
    }
    return days
}

// ====== Main seed
const seedDatabase = async () => {
    seedValue = 20261008
    usedCodes.clear()

    // ====== Users
    // Trainee A is on Day 20 (Supervised Live Work), trainee B started later and is on Day 9
    const senior = await userSchema.create({ fullName: 'Farhan Ahmed', email: 'senior@strops.test', password: 'Senior@123', role: 'senior', isVerified: true, track: 'Guest Experience' })
    const trainee = await userSchema.create({ fullName: 'Rahim Hasan', email: 'trainee@strops.test', password: 'Trainee@123', role: 'trainee', isVerified: true, track: 'Automation and Reporting', trainingStart: trainingStartFor(20) })
    const traineeB = await userSchema.create({ fullName: 'Nadia Rahman', email: 'trainee2@strops.test', password: 'Trainee@123', role: 'trainee', isVerified: true, track: 'Revenue and Listings', trainingStart: trainingStartFor(9) })
    await userSchema.create({ fullName: 'Sadia Karim', email: 'admin@strops.test', password: 'Admin@123', role: 'admin', isVerified: true })
    // Two property owners (clients), each owns two properties
    const ownerA = await userSchema.create({ fullName: 'John Carter', email: 'client@strops.test', password: 'Client@123', role: 'client', isVerified: true })
    const ownerB = await userSchema.create({ fullName: 'Maria Lopez', email: 'owner2@strops.test', password: 'Client@123', role: 'client', isVerified: true })
    // A guest who books on our own site
    const guestUser = await userSchema.create({ fullName: 'Emma Wilson', email: 'guest@strops.test', password: 'Guest@123', role: 'guest', isVerified: true })

    // ====== Properties + reservations
    const OWNERS = { P1: ownerA, P2: ownerA, P3: ownerB, P4: ownerB }
    const DESCRIPTIONS = {
        P1: 'Bright loft a short walk from the lake trail, with fast wifi and a dedicated workspace.',
        P2: 'Desert bungalow with a private pool, palm-shaded patio and room for the whole family.',
        P3: 'Cozy historic-district flat, steps from restaurants, galleries and the waterfront.',
        P4: 'Timber cabin in the Smoky Mountains with a hot tub, fireplace and mountain views.',
    }
    const AMENITIES = {
        P1: ['Fast wifi (300 Mbps)', 'Lake view', 'Free parking', 'Air conditioning', 'Washer & dryer', 'Self check-in', 'Coffee maker', 'Travel crib'],
        P2: ['Private pool', 'Patio with grill', 'Free parking', 'Air conditioning', 'Washer & dryer', 'Self check-in', 'Dedicated workspace', 'Wifi'],
        P3: ['Walk to restaurants', 'Wifi', 'Air conditioning', 'Self check-in', 'Coffee maker', 'Historic building'],
        P4: ['Hot tub', 'Fireplace', 'Mountain view', 'Free parking', 'Wifi', 'Self check-in', 'Board games'],
    }
    const properties = {}
    for (const p of PROPERTIES) {
        const { gap, stay, ...data } = p
        properties[p.code] = await propertySchema.create({
            ...data,
            owner: OWNERS[p.code]._id,
            image: `/uploads/properties/${p.code.toLowerCase()}.jpg`,
            description: DESCRIPTIONS[p.code],
            amenities: AMENITIES[p.code],
            maxGuests: p.bedrooms * 2,
            audit: { ...data.audit, auditedAt: dayOffset(-randInt(3, 20)) },
        })
    }

    const allReservations = []
    for (const code of Object.keys(properties)) allReservations.push(...buildReservations(properties[code]))

    // One fresh booking so "new bookings" looks healthy
    const fresh = allReservations.find((r) => r.type === 'guest' && r.status === 'confirmed' && r.checkIn > dayOffset(10))
    if (fresh) fresh.bookedAt = minutesAgo(95)
    await reservationSchema.insertMany(allReservations)

    const findStay = (code, checkInOffset) =>
        allReservations.find((r) => String(r.property) === String(properties[code]._id) && r.checkIn.getTime() === dayOffset(checkInOffset).getTime())

    const p1Out = findStay('P1', -3)
    const p1In = findStay('P1', 0)
    const p2Stay = findStay('P2', -2)
    const p3In = findStay('P3', 0)
    const p4Out = findStay('P4', -5)
    const p4Next = findStay('P4', 1)

    // ====== Inbox threads
    const threads = await threadSchema.insertMany([
        {
            property: properties.P1._id, reservationCode: p1Out.code, channel: p1Out.channel, stage: 'pre_checkout',
            messages: [
                { sender: 'guest', body: 'Hi! What time is checkout again, and where should we leave the keys?', sentAt: minutesAgo(16 * 60) },
                { sender: 'host', body: `Hi ${p1Out.guestFirstName}! Checkout is 11 AM. The door locks automatically, so just leave the keys on the kitchen counter. Safe travels!`, sentAt: minutesAgo(16 * 60 - 7) },
            ],
        },
        {
            property: properties.P1._id, reservationCode: p1In.code, channel: p1In.channel, stage: 'check_in', needsReply: true,
            messages: [{ sender: 'guest', body: 'Hi there, any chance of an early check-in around 1 PM? Our flight lands at 10.', sentAt: minutesAgo(25) }],
        },
        {
            property: properties.P2._id, reservationCode: p2Stay.code, channel: p2Stay.channel, stage: 'pre_checkout', needsReply: true,
            escalate: true, escalateTo: 'On-call senior + HVAC vendor',
            messages: [
                { sender: 'guest', body: 'The AC is not cooling at all, it is 84 degrees inside.', sentAt: minutesAgo(58) },
                { sender: 'host', body: `I'm so sorry, ${p2Stay.guestFirstName}. That's not okay in this heat. I've called our HVAC technician and will update you within 30 minutes.`, sentAt: minutesAgo(52) },
                { sender: 'guest', body: 'Thanks. Any update on the technician?', sentAt: minutesAgo(15) },
            ],
        },
        {
            property: properties.P3._id, reservationCode: p3In.code, channel: p3In.channel, stage: 'check_in', needsReply: true,
            messages: [{ sender: 'guest', body: 'What is the wifi password? Also is street parking okay overnight?', sentAt: minutesAgo(72) }],
        },
        {
            property: properties.P4._id, reservationCode: p4Out.code, channel: p4Out.channel, stage: 'post_checkout', needsReply: true,
            messages: [{ sender: 'guest', body: 'We have left, thanks for everything! Sorry, the bedroom lamp fell and the shade cracked.', sentAt: minutesAgo(31) }],
        },
        {
            property: properties.P4._id, reservationCode: p4Next.code, channel: p4Next.channel, stage: 'pre_arrival', needsReply: true,
            messages: [{ sender: 'guest', body: 'Is the hot tub working? We read a review saying it was cold.', sentAt: minutesAgo(41) }],
        },
        {
            property: properties.P1._id, reservationCode: fresh.code, channel: fresh.channel, stage: 'booking',
            messages: [
                { sender: 'guest', body: 'Just booked! Is the place okay for a 2 year old? Do you have a crib?', sentAt: minutesAgo(90) },
                { sender: 'host', body: `Welcome, ${fresh.guestFirstName}! Yes, we have a travel crib and a high chair. I'll make sure both are set up before you arrive.`, sentAt: minutesAgo(82) },
            ],
        },
    ])

    // ====== Drafts (Day 20 Draft Log)
    await draftSchema.insertMany([
        {
            thread: threads[1]._id, property: properties.P1._id, reservationCode: p1In.code, type: 'reply', author: trainee._id, status: 'pending',
            body: `Hi ${p1In.guestFirstName}! Thanks for letting us know. Our cleaners are preparing the home today, so I can't promise 1 PM yet. I'll confirm by 11 AM. If it works, early check-in is a $35 add-on. Standard check-in is 4 PM.`,
        },
        {
            thread: threads[6]._id, property: properties.P1._id, reservationCode: fresh.code, type: 'reply', author: trainee._id, status: 'approved',
            body: threads[6].messages[1].body, finalBody: threads[6].messages[1].body, reviewer: senior._id, reviewedAt: minutesAgo(83),
        },
        {
            thread: threads[2]._id, property: properties.P2._id, reservationCode: p2Stay.code, type: 'reply', author: trainee._id, status: 'rejected',
            body: 'Sorry for the heat. Please open the windows.',
            feedback: 'No action and no time frame. Use the complaint formula: acknowledge, apologise, act, time frame, follow up.',
            reviewer: senior._id, reviewedAt: minutesAgo(54),
        },
        {
            thread: threads[2]._id, property: properties.P2._id, reservationCode: p2Stay.code, type: 'task', author: trainee._id, status: 'edited',
            body: 'Create maintenance ticket: AC not cooling.',
            finalBody: 'Create URGENT maintenance ticket: AC not cooling, 84F inside, guest in house until tomorrow 11 AM. Vendor lockbox info in PMS notes.',
            feedback: 'Always include urgency, guest status and access info.', reviewer: senior._id, reviewedAt: minutesAgo(50),
        },
        {
            thread: threads[4]._id, property: properties.P4._id, reservationCode: p4Out.code, type: 'reply', author: trainee._id, status: 'pending',
            body: `Thank you for letting us know, ${p4Out.guestFirstName}, and thanks for staying with us! Accidents happen. We'll take a look during cleaning today.`,
        },
    ].map((draft, i) => ({ ...draft, createdAt: minutesAgo([20, 86, 56, 53, 27][i]) })))

    // ====== Trainee B drafts (earlier in the academy, lower approval rate)
    await draftSchema.insertMany([
        {
            thread: threads[5]._id, property: properties.P4._id, reservationCode: p4Next.code, type: 'reply', author: traineeB._id, status: 'rejected',
            body: 'Yes the hot tub works fine.', createdAt: minutesAgo(35),
            feedback: 'We cannot promise that: the heater was repaired 9 days ago. Say it was serviced, give the temperature, and offer to check it before arrival.',
            reviewer: senior._id, reviewedAt: minutesAgo(30),
        },
        {
            thread: threads[0]._id, property: properties.P1._id, reservationCode: p1Out.code, type: 'reply', author: traineeB._id, status: 'edited',
            body: 'Checkout is 11. Leave keys inside.', finalBody: threads[0].messages[1].body, createdAt: minutesAgo(16 * 60 + 10),
            feedback: 'Use the guest first name and a warm close.', reviewer: senior._id, reviewedAt: minutesAgo(16 * 60 + 8),
        },
    ])

    // ====== End-of-Day reports (workbook Section 03)
    const EOD_A = [
        { tasks: '1 done / 2 done / 3 done / 4 partly', submitted: 'D16_Rahim_Workflows.zip', learned: ['Webhook vs polling in n8n', 'Error workflows catch silent failures', 'Never type keys into Set nodes'], blocker: 'Slack node needed a credential I did not have', question: 'Who owns the Slack credential in staging?', confidence: 3 },
        { tasks: '1 done / 2 done / 3 done / 4 done', submitted: 'D17_Rahim_SOP_Runbook.pdf', learned: ['Each SOP step starts with a verb', 'Runbook = what to check, in order', 'Escalate within 15 minutes'], blocker: '', question: 'Do runbooks live in the PMS or the drive?', confidence: 4 },
        { tasks: '1 done / 2 done / 3 done / 4 done', submitted: 'D18_Rahim_Checkpoint3.pdf', learned: ['The broken workflow had a wrong date format', 'Read every line of the diff', 'Staging first, always'], blocker: '', question: 'Can I add a filter to the turnover panel next?', confidence: 4 },
        { tasks: '1 done / 2 done / 3 done / 4 partly', submitted: 'D19_Rahim_ShadowLog.pdf', learned: ['Seniors reply before they fix', 'Early check-in is an upsell, not a favour', 'Always log the reply time'], blocker: 'US hours shift made me tired by 10 PM', question: 'How do I price a late checkout on a same-day turnover?', confidence: 3 },
    ]
    const EOD_B = [
        { tasks: '1 done / 2 done / 3 partly / 4 done / 5 done', submitted: 'D06_Nadia_Checkpoint1.pdf', learned: ['ADR vs RevPAR', 'Complaint formula has 5 steps', 'Escalate safety issues first'], blocker: '', question: 'What was my quiz score?', confidence: 3 },
        { tasks: '1 done / 2 done / 3 done / 4 partly / 5 done', submitted: 'D07_Nadia_PricingReview.pdf', learned: ['Gap nights need a 1-night minimum', 'Events can justify +35%', 'Owner min/max are hard limits'], blocker: 'Could not find local events for Gatlinburg', question: 'Which event calendar do we trust?', confidence: 2 },
        { tasks: '1 done / 2 done / 3 done / 4 done', submitted: 'D08_Nadia_ListingAudit.pdf', learned: ['First photo should be the best room', 'Titles stay under the character limit', 'Missing amenity tags lose searches'], blocker: '', question: 'Can I audit a real listing tomorrow?', confidence: 4 },
    ]
    const eods = []
    pastTrainingDays(EOD_A.length).forEach((date, i) =>
        eods.push({
            ...EOD_A[i], user: trainee._id, date, day: 16 + i, hoursWorked: 7, tomorrowCardRead: true,
            ...(i < 3 ? { reviewNote: ['Ask Farhan for the staging Slack credential, never copy keys.', 'Good runbook. Add the 15-minute escalation timer.', 'Yes, try the filter in staging first.'][i], reviewedBy: senior._id, reviewedAt: date } : {}),
        })
    )
    pastTrainingDays(EOD_B.length).forEach((date, i) =>
        eods.push({
            ...EOD_B[i], user: traineeB._id, date, day: 6 + i, hoursWorked: 7, tomorrowCardRead: i !== 1,
            ...(i === 1 ? { reviewNote: 'Use the city tourism calendar and the convention center schedule.', reviewedBy: senior._id, reviewedAt: date } : {}),
        })
    )
    await eodSchema.insertMany(eods)

    // ====== Turnovers (Day 5 + Track 3)
    const cleaners = { P1: 'BrightNest Cleaning', P2: 'Desert Clean Co.', P3: 'Lowcountry Turnovers', P4: 'Smoky Mtn Housekeeping' }
    const areas = ['Bedrooms', 'Bathroom', 'Kitchen', 'Living', 'Supplies', 'Damage']
    const turnovers = []
    for (const code of Object.keys(properties)) {
        const stays = allReservations
            .filter((r) => String(r.property) === String(properties[code]._id) && r.type === 'guest' && r.status === 'confirmed')
            .sort((a, b) => a.checkIn - b.checkIn)
        stays.forEach((r, i) => {
            const offset = Math.round((r.checkOut - dayOffset(0)) / DAY)
            if (offset < -7 || offset > 3) return
            const next = stays[i + 1]
            const isPast = offset < 0
            const isToday = offset === 0
            const supplies = [
                { item: 'Toilet paper', level: randInt(8, 16), par: 8 },
                { item: 'Coffee pods', level: randInt(12, 30), par: 12 },
                { item: 'Trash bags', level: randInt(5, 20), par: 6 },
                { item: 'Hand soap', level: randInt(2, 4), par: 2 },
            ]
            let photoQc = areas.map((area) => ({ area, pass: isPast ? true : null, note: '' }))
            let qcStatus = isPast ? 'approved' : 'pending'
            let qcReason = ''
            let status = isPast ? 'done' : 'scheduled'
            if (isPast && offset === -2) {
                photoQc = photoQc.map((a) => (a.area === 'Bathroom' ? { ...a, pass: false, note: 'Hair visible in shower tray (photo 7)' } : a))
                qcStatus = 'rejected'
                qcReason = 'Bathroom not clean in photos. Cleaner sent back, re-shot photos approved 45 min later.'
            }
            if (isToday && code === 'P1') status = 'in_progress'
            if (isToday && code === 'P4') {
                status = 'done'
                photoQc = areas.map((area) => ({ area, pass: area === 'Damage' ? false : true, note: area === 'Damage' ? 'Bedroom lamp shade cracked (photo 14)' : '' }))
            }
            if (code === 'P1' && (isToday || offset === 1)) {
                supplies[0].level = 3
                supplies[1].level = 4
            }
            turnovers.push({
                property: properties[code]._id, reservationCode: r.code, nextReservationCode: next?.code || '',
                scheduledFor: at(offset, 16), cleaner: cleaners[code], status, photoQc, qcStatus, qcReason, supplies,
            })
        })
    }
    await turnoverSchema.insertMany(turnovers)

    // ====== Smart home alerts (Day 5)
    await alertSchema.insertMany([
        {
            property: properties.P1._id, source: 'Domotz', type: 'Router offline', severity: 'critical', status: 'open', raisedAt: minutesAgo(14),
            message: 'No heartbeat from the router for 14 minutes. Guest checking in today.',
            firstResponse: 'Remote power-cycle the router from Domotz. If still offline after 10 min, call the ISP and message the arriving guest with a hotspot plan.',
        },
        {
            property: properties.P2._id, source: 'Minut', type: 'High temperature', severity: 'warning', status: 'acknowledged', raisedAt: minutesAgo(64),
            reservationCode: p2Stay.code, message: 'Indoor temperature 84°F for 60+ minutes.',
            firstResponse: 'Check thermostat remotely, confirm with guest, open an urgent HVAC ticket.',
        },
        {
            property: properties.P2._id, source: 'Minut', type: 'Noise', severity: 'warning', status: 'open', raisedAt: minutesAgo(35),
            reservationCode: p2Stay.code, message: 'Noise 72 dB for 12 minutes (threshold 70 dB).',
            firstResponse: 'Send a friendly noise reminder. If it continues 20 more minutes, call the guest and escalate to the senior.',
        },
        {
            property: properties.P4._id, source: 'Smart lock', type: 'Low battery', severity: 'warning', status: 'open', raisedAt: minutesAgo(190),
            message: 'Front door lock battery at 15%.',
            firstResponse: "Ask today's cleaner to swap batteries before the next check-in. Confirm the guest code still works.",
        },
        {
            property: properties.P1._id, source: 'Smart lock', type: 'Failed code attempts', severity: 'info', status: 'resolved', raisedAt: minutesAgo(20 * 60),
            reservationCode: p1Out.code, message: '3 failed code attempts at 9:42 PM.',
            firstResponse: 'Message the guest to confirm the right code. If locked out, follow the Guest Lockout SOP.',
        },
        {
            property: properties.P3._id, source: 'Minut', type: 'Crowd estimate', severity: 'warning', status: 'resolved', raisedAt: minutesAgo(3 * 24 * 60),
            message: 'Device count suggests more people than the booked guest count.',
            firstResponse: 'Check the booked guest count, send a polite house-rules reminder, escalate if the count keeps rising.',
        },
    ])

    // ====== Pricing calendar (Day 7)
    for (const code of Object.keys(properties)) await priceDaySchema.insertMany(buildPriceDays(properties[code]))

    // ====== Screening (Day 9): 8 upcoming guest bookings
    const upcoming = allReservations
        .filter((r) => r.type === 'guest' && r.status === 'confirmed' && r.checkIn >= dayOffset(1) && r.checkIn <= dayOffset(30))
        .sort((a, b) => a.checkIn - b.checkIn)
        .slice(0, 8)
    const profiles = [
        { riskScore: 12, flags: ['ID verified', '8 positive host reviews'], idVerified: true, decision: 'approve', reason: 'Verified ID and strong review history.' },
        { riskScore: 34, flags: ['ID verified', 'First booking on the platform'], idVerified: true, decision: 'approve', reason: 'New account but ID verified and trip purpose is clear (family visit).' },
        { riskScore: 58, flags: ['Local guest (within 15 miles)', 'Booked same day', '1-night weekend request'], idVerified: true, decision: 'pending' },
        { riskScore: 71, flags: ['Party keywords in message ("celebration", "friends coming over")', 'Guest count at maximum', 'Saturday night only'], idVerified: true, decision: 'pending' },
        { riskScore: 45, flags: ['ID check not completed', 'Check-in within 3 days'], idVerified: false, decision: 'investigate', reason: 'ID check still open close to arrival.', followUp: 'Send verification chase message' },
        { riskScore: 82, flags: ['Account created 2 days ago', 'Profile and payment names do not match (tool flag)', 'No reviews'], idVerified: false, decision: 'pending' },
        { riskScore: 22, flags: ['ID verified', 'Returning guest'], idVerified: true, decision: 'approve', reason: 'Returning guest with no past issues.' },
        { riskScore: 39, flags: ['ID check not completed', 'Booked by a third party for someone else'], idVerified: false, decision: 'pending' },
    ]
    await screeningSchema.insertMany(
        upcoming.map((r, i) => ({
            property: r.property, reservationCode: r.code, checkIn: r.checkIn, ...profiles[i],
            decidedBy: profiles[i].decision === 'pending' ? undefined : senior._id,
        }))
    )

    // ====== Reviews (Day 10)
    const pastStays = (code) =>
        allReservations.filter((r) => String(r.property) === String(properties[code]._id) && r.type === 'guest' && r.checkOut < dayOffset(-1))
    const reviewSeed = [
        ['P1', 5, 'Spotless, great view of the lake and super quick replies from the host.', true],
        ['P1', 3, 'Great location but street noise at night and the wifi dropped twice.', true],
        ['P1', 5, 'Perfect for our work trip. Fast wifi and a comfy bed.', true],
        ['P2', 5, 'The pool and patio were amazing. Would stay again.', true],
        ['P2', 3, 'Check-in instructions were confusing and the door code did not work at first.', true],
        ['P2', 4, 'Lovely home, a bit warm in the afternoon.', true],
        ['P3', 5, 'Walkable to everything. Felt like a local.', true],
        ['P3', 2, 'Smaller than the photos suggest and the AC unit was very loud.', true],
        ['P3', 5, 'Host left great restaurant tips. Loved it.', false],
        ['P4', 2, 'Hot tub was cold the whole stay and the host took a day to respond.', false],
        ['P4', 3, 'Cabin was dusty and there was hair in the shower.', false],
        ['P4', 4, 'Beautiful setting, quiet and cozy.', true],
    ]
    const reviews = reviewSeed.map(([code, rating, text, replied], i) => {
        const stays = pastStays(code)
        const stay = stays[stays.length - 1 - (i % 3) * 2] || stays[0]
        const postedAt = new Date(stay.checkOut.getTime() + randInt(1, 4) * DAY)
        return {
            property: properties[code]._id, reservationCode: stay.code, channel: stay.channel, rating, text, postedAt,
            reply: replied ? (rating >= 4 ? 'Thank you so much for staying with us. You are welcome back any time!' : 'Thank you for the honest feedback. We have fixed this and added a note to our checklist.') : '',
            repliedAt: replied ? new Date(postedAt.getTime() + DAY) : undefined,
        }
    })
    await reviewSchema.insertMany(reviews)

    // ====== Damage claims (Day 10)
    const p2Past = pastStays('P2').find((r) => r.checkOut >= dayOffset(-10) && r.checkOut <= dayOffset(-3)) || pastStays('P2').pop()
    const p1Past = pastStays('P1')[2]
    await claimSchema.insertMany([
        {
            property: properties.P2._id, reservationCode: p2Past.code, channel: p2Past.channel, amount: 385, status: 'open',
            issue: 'Red wine stain on sofa cushion and broken floor lamp', checkoutDate: p2Past.checkOut,
            deadline: new Date(p2Past.checkOut.getTime() + 14 * DAY),
            checklist: { checkInPhotos: true, checkoutPhotos: true, timeline: true, guestMessages: true, repairQuote: false, filedInTime: false, firstMessage: true },
        },
        {
            property: properties.P1._id, reservationCode: p1Past.code, channel: p1Past.channel, amount: 220, status: 'paid',
            issue: 'Burn mark on kitchen counter', checkoutDate: p1Past.checkOut, deadline: new Date(p1Past.checkOut.getTime() + 14 * DAY),
            checklist: { checkInPhotos: true, checkoutPhotos: true, timeline: true, guestMessages: true, repairQuote: true, filedInTime: true, firstMessage: true },
        },
    ])

    // ====== Maintenance tickets (Day 11)
    await ticketSchema.insertMany([
        {
            property: properties.P2._id, reservationCode: p2Stay.code, issue: 'AC not cooling, indoor temp 84°F, guest in house', category: 'HVAC',
            urgency: 'urgent', vendor: 'CoolAir HVAC', accessInfo: 'Vendor lockbox, code in PMS property notes', photos: 2, status: 'assigned',
            updates: [{ note: 'Ticket created from guest message', at: minutesAgo(50) }, { note: 'Vendor confirmed, ETA 2:30 PM local', at: minutesAgo(38) }],
        },
        {
            property: properties.P1._id, issue: 'Bathroom sink draining slowly', category: 'Plumbing', urgency: 'medium', vendor: 'Plumb Right Austin',
            accessInfo: 'Coordinate with cleaner on turnover day', photos: 1, status: 'open', updates: [{ note: 'Flagged by cleaner', at: minutesAgo(26 * 60) }],
        },
        {
            property: properties.P3._id, issue: 'Smoke detector chirping in hallway', category: 'Safety', urgency: 'high', vendor: 'Lowcountry Fix-It',
            accessInfo: 'Guest in house, schedule with guest first', photos: 0, status: 'in_progress', cost: 45,
            updates: [{ note: 'Guest reported chirp', at: minutesAgo(5 * 60) }, { note: 'Handyman booked for 4 PM', at: minutesAgo(4 * 60) }],
        },
        {
            property: properties.P4._id, issue: 'Hot tub heater not reaching temperature', category: 'Hot tub', urgency: 'high', vendor: 'Smoky Spa Service',
            accessInfo: 'Side gate, code in PMS notes', photos: 3, status: 'closed', cost: 260, closedAt: dayOffset(-9),
            updates: [{ note: 'Heater element replaced', at: dayOffset(-9) }],
        },
        {
            property: properties.P4._id, issue: 'Front door lock battery low', category: 'Smart lock', urgency: 'low', vendor: 'Cleaner (on turnover)',
            accessInfo: 'Spare batteries in owner closet', photos: 0, status: 'open', updates: [{ note: 'Auto-created from lock alert', at: minutesAgo(185) }],
        },
        {
            property: properties.P1._id, issue: 'Replace living room blinds', category: 'Furnishing', urgency: 'low', vendor: 'Austin Blinds Co.',
            accessInfo: 'Turnover day', photos: 2, status: 'closed', cost: 140, closedAt: dayOffset(-25),
            updates: [{ note: 'Installed', at: dayOffset(-25) }],
        },
    ])

    // ====== Integrations (Day 13 + Day 15)
    await integrationSchema.insertMany([
        { name: 'Hostaway (PMS)', category: 'PMS', feeds: ['Reservations', 'Inbox', 'Listings', 'Tasks'], mode: 'webhook', staleAfterMin: 30, lastSyncAt: minutesAgo(2), lastSuccessAt: minutesAgo(2), lastStatus: 200 },
        { name: 'Airbnb (via channel manager)', category: 'Channel', feeds: ['Listings', 'Reviews'], mode: 'polling', intervalMin: 15, staleAfterMin: 45, lastSyncAt: minutesAgo(5), lastSuccessAt: minutesAgo(5), lastStatus: 200 },
        { name: 'VRBO (via channel manager)', category: 'Channel', feeds: ['Listings', 'Reviews'], mode: 'polling', intervalMin: 15, staleAfterMin: 45, lastSyncAt: minutesAgo(9), lastSuccessAt: minutesAgo(9), lastStatus: 200 },
        { name: 'Booking.com (via channel manager)', category: 'Channel', feeds: ['Listings', 'Reviews'], mode: 'polling', intervalMin: 15, staleAfterMin: 45, lastSyncAt: minutesAgo(7), lastSuccessAt: minutesAgo(7), lastStatus: 200 },
        { name: 'PriceLabs', category: 'Pricing', feeds: ['Pricing calendar', 'Min stay'], mode: 'polling', intervalMin: 60, staleAfterMin: 180, lastSyncAt: minutesAgo(25), lastSuccessAt: minutesAgo(25), lastStatus: 200 },
        { name: 'Minut', category: 'Smart home', feeds: ['Noise', 'Temperature', 'Crowd'], mode: 'webhook', staleAfterMin: 60, lastSyncAt: minutesAgo(3), lastSuccessAt: minutesAgo(3), lastStatus: 200 },
        { name: 'Domotz', category: 'Smart home', feeds: ['Wifi / network'], mode: 'polling', intervalMin: 10, staleAfterMin: 30, lastSyncAt: minutesAgo(4), lastSuccessAt: minutesAgo(190), lastStatus: 401, lastError: 'API key rejected. Likely expired or rotated.' },
        { name: 'Smart lock hub', category: 'Smart home', feeds: ['Lock events', 'Battery'], mode: 'webhook', staleAfterMin: 120, lastSyncAt: minutesAgo(11), lastSuccessAt: minutesAgo(11), lastStatus: 200 },
        { name: 'Screening tool', category: 'Trust & Safety', feeds: ['Risk score', 'ID verification'], mode: 'polling', intervalMin: 30, staleAfterMin: 90, lastSyncAt: minutesAgo(6), lastSuccessAt: minutesAgo(52), lastStatus: 429, lastError: 'Too many requests. Retry after 60 seconds.' },
        { name: 'n8n', category: 'Automation', feeds: ['Workflows', 'Alerts'], mode: 'webhook', staleAfterMin: 30, lastSyncAt: minutesAgo(1), lastSuccessAt: minutesAgo(1), lastStatus: 200 },
    ])

    // ====== n8n workflow runs, last 7 days (Day 16 + Track 5)
    const workflows = ['New booking → Slack alert', 'Review request booster', 'Turnover task creator', 'Wifi offline → Slack alert', 'Screening sync', 'Daily morning-check digest']
    const runs = []
    for (let h = 7 * 24; h > 0; h -= 3) {
        const workflow = workflows[(h / 3) % workflows.length]
        const startedAt = minutesAgo(h * 60 + randInt(0, 50))
        let status = 'success'
        let errorCause = ''
        let message = ''
        if (workflow === 'Wifi offline → Slack alert' && h <= 6) {
            status = 'error'; errorCause = '401 Unauthorized (expired credential)'; message = 'Domotz API rejected the saved credential.'
        } else if (workflow === 'Screening sync' && rand() < 0.4) {
            status = 'error'; errorCause = '429 Rate limited'; message = 'Screening tool returned 429. Retry scheduled.'
        } else if (workflow === 'Turnover task creator' && rand() < 0.15) {
            status = 'error'; errorCause = 'Timeout calling PMS API'; message = 'No response from PMS after 30s.'
        } else if (workflow === 'New booking → Slack alert' && rand() < 0.12) {
            status = 'error'; errorCause = 'Missing field in payload'; message = 'guestFirstName was empty in the webhook body.'
        }
        runs.push({ workflow, status, startedAt, durationMs: randInt(300, 4200), errorCause, message })
    }
    // The Domotz key broke ~3 h ago, so the wifi alert workflow is failing now
    for (const m of [170, 110, 50]) {
        runs.push({ workflow: 'Wifi offline → Slack alert', status: 'error', startedAt: minutesAgo(m), durationMs: randInt(300, 900), errorCause: '401 Unauthorized (expired credential)', message: 'Domotz API rejected the saved credential.' })
    }
    await workflowRunSchema.insertMany(runs)

    // ====== Escalation list (Day 15)
    await contactSchema.insertMany([
        { order: 1, problemType: 'Guest safety emergency (fire, injury, break-in)', contact: 'Guest calls 911 first, then on-call senior', channel: 'Phone', urgency: 'now' },
        { order: 2, problemType: 'Guest lockout', contact: 'On-call senior', channel: 'Ops channel + phone', urgency: 'now', notes: 'Follow the Guest Lockout SOP while waiting.' },
        { order: 3, problemType: 'Noise / party alert', contact: 'On-call senior (owner if repeated)', channel: 'Ops channel', urgency: 'within_1_hr' },
        { order: 4, problemType: 'No AC / heat, leak, no hot water', contact: 'Maintenance vendor via senior', channel: 'Ops channel', urgency: 'within_1_hr' },
        { order: 5, problemType: 'Wifi outage', contact: 'Senior, then ISP', channel: 'Ops channel', urgency: 'within_1_hr' },
        { order: 6, problemType: 'Cleaning QC failed before check-in', contact: 'Cleaning lead', channel: 'Ops channel', urgency: 'within_1_hr' },
        { order: 7, problemType: 'Integration stopped syncing / 401 / 5xx', contact: 'Automation lead', channel: 'Ops channel', urgency: 'within_1_hr', notes: 'Stop, capture the error without secrets, escalate within 15 minutes.' },
        { order: 8, problemType: 'Damage or claim', contact: 'Trust & Safety lead', channel: 'Ops channel', urgency: 'today' },
        { order: 9, problemType: 'Risky booking (decline decision)', contact: 'Trust & Safety lead, then owner', channel: 'Ops channel', urgency: 'today' },
        { order: 10, problemType: 'Price below owner minimum / refund request', contact: 'Revenue lead, then owner', channel: 'Ops channel', urgency: 'today' },
    ])

    await escalationSchema.insertMany([
        {
            urgency: 'within_1_hr', property: properties.P2._id, reservationCode: p2Stay.code, need: 'approval', status: 'open', createdBy: trainee._id,
            whatHappened: 'AC not cooling, guest reports 84°F inside. Checkout is tomorrow.',
            alreadyDid: 'Apologised to guest, opened urgent ticket, vendor ETA 2:30 PM.',
            suggestion: 'Approve a $60 partial refund for one hot night and a portable fan drop-off.',
        },
        {
            urgency: 'today', property: properties.P1._id, reservationCode: p1Out.code, need: 'decision', status: 'resolved', createdBy: trainee._id, resolvedBy: senior._id,
            whatHappened: 'Guest asked for late checkout at 1 PM, same-day turnover.',
            alreadyDid: 'Checked cleaner schedule.',
            suggestion: 'Offer 12 PM for $25 instead of 1 PM.',
        },
    ])

    // ====== Guest trips on our site: one finished stay to review, one upcoming, one request waiting
    const reviewedCodes = (await reviewSchema.find().select('reservationCode')).map((r) => r.reservationCode)
    const claimCodes = (await claimSchema.find().select('reservationCode')).map((c) => c.reservationCode)
    const pastTrip = await reservationSchema.findOne({
        property: properties.P2._id, type: 'guest', status: 'confirmed', checkOut: { $gte: dayOffset(-30), $lte: dayOffset(-4) },
        code: { $nin: [...reviewedCodes, ...claimCodes] },
    })
    const nextTrip = await reservationSchema.findOne({ property: properties.P1._id, type: 'guest', status: 'confirmed', checkIn: { $gte: dayOffset(10), $lte: dayOffset(50) } })
    for (const trip of [pastTrip, nextTrip].filter(Boolean)) {
        trip.guest = guestUser._id
        trip.guestFirstName = 'Emma'
        trip.channel = 'Direct'
        trip.otaFee = round((trip.roomRevenue + trip.cleaningFee) * FEE_RATE.Direct)
        await trip.save()
    }
    // A 3-night request in the first open gap at Harbor Street Flat
    const p3Stays = await reservationSchema.find({ property: properties.P3._id, status: { $ne: 'cancelled' }, checkOut: { $gt: dayOffset(14) } })
    for (let d = 14; d < 58; d++) {
        const from = dayOffset(d)
        const to = dayOffset(d + 3)
        if (p3Stays.some((r) => r.checkIn < to && r.checkOut > from)) continue
        let roomRevenue = 0
        for (let k = d; k < d + 3; k++) roomRevenue += nightlyPrice(properties.P3, k)
        await reservationSchema.create({
            code: makeCode('Direct'), property: properties.P3._id, type: 'guest', guest: guestUser._id, guestFirstName: 'Emma', channel: 'Direct',
            checkIn: from, checkOut: to, nights: 3, guests: 2, nightlyRate: round(roomRevenue / 3), roomRevenue, cleaningFee: properties.P3.cleaningFee,
            otaFee: 0, status: 'pending', bookedAt: minutesAgo(40),
        })
        break
    }

    console.log('Mock data seeded.')
}

const seedIfEmpty = async () => {
    try {
        const count = await propertySchema.countDocuments()
        if (count === 0) await seedDatabase()
    } catch (error) {
        console.log(error)
    }
}

// ====== `npm run seed`: wipe and reseed the database in DB_STRING
if (require.main === module) {
    require('dotenv').config()
    const mongoose = require('mongoose')
    const { startLocalDb, stopLocalDb } = require('../dbConfig/localDb')

    const run = async () => {
        const uri = process.env.DB_STRING || (await startLocalDb())
        await mongoose.connect(uri)
        await mongoose.connection.db.dropDatabase()
        await seedDatabase()
        await mongoose.disconnect()
        await stopLocalDb()
        console.log(`Reseeded ${process.env.DB_STRING ? 'the database in DB_STRING' : 'the local database'}.`)
        process.exit(0)
    }

    run()
        .catch((err) => {
            console.log('DB connection error:', err.message)
            process.exit(1)
        })
}

module.exports = { seedIfEmpty, seedDatabase }
