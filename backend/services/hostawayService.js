const propertySchema = require('../models/propertySchema')
const reservationSchema = require('../models/reservationSchema')
const integrationSchema = require('../models/integrationSchema')
const { DAY, startOfToday, round } = require('./helpers')

// ====== Hostaway public API (https://api.hostaway.com/v1)
// Credentials come only from .env: HOSTAWAY_ACCOUNT_ID + HOSTAWAY_API_KEY.
const API_BASE = () => process.env.HOSTAWAY_API_BASE || 'https://api.hostaway.com/v1'
const PAGE_SIZE = 100
const MAX_PAGES = 50
const INTEGRATION_NAME = 'Hostaway (PMS)'

// Typical channel commission when Hostaway does not send the fee (used for host net only)
const FEE_RATE = { Airbnb: 0.155, VRBO: 0.08, 'Booking.com': 0.15, Direct: 0.03 }

let cachedToken = null
let syncing = false

const isConfigured = () => !!(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY)

// ====== Access token (client credentials). Cached in memory, never logged or stored.
const getToken = async () => {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) return cachedToken.value
    const res = await fetch(`${API_BASE()}/accessTokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-control': 'no-cache' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.HOSTAWAY_ACCOUNT_ID,
            client_secret: process.env.HOSTAWAY_API_KEY,
            scope: 'general',
        }),
    })
    if (!res.ok) {
        const error = new Error(res.status === 401 || res.status === 403 ? 'Hostaway rejected the account ID or API key' : `Hostaway token request failed (${res.status})`)
        error.status = res.status
        throw error
    }
    const json = await res.json()
    cachedToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 }
    return cachedToken.value
}

// ====== GET with one retry on 401 (expired token)
const apiGet = async (path, params = {}, retried = false) => {
    const url = new URL(`${API_BASE()}${path}`)
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v))
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await getToken()}`, 'Cache-control': 'no-cache' } })
    if (res.status === 401 && !retried) {
        cachedToken = null
        return apiGet(path, params, true)
    }
    if (!res.ok) {
        const error = new Error(res.status === 429 ? 'Hostaway rate limit reached, will retry next sync' : `Hostaway ${path} failed (${res.status})`)
        error.status = res.status
        throw error
    }
    return res.json()
}

const fetchAll = async (path, params = {}) => {
    const rows = []
    for (let page = 0; page < MAX_PAGES; page++) {
        const json = await apiGet(path, { ...params, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
        const result = Array.isArray(json.result) ? json.result : []
        rows.push(...result)
        if (result.length < PAGE_SIZE) break
    }
    return rows
}

// ====== Field mapping (Hostaway names → ours). Guest PII is dropped: first name only.
const mapChannel = (name = '') => {
    const n = String(name).toLowerCase()
    if (n.includes('airbnb')) return 'Airbnb'
    if (n.includes('vrbo') || n.includes('homeaway')) return 'VRBO'
    if (n.includes('booking')) return 'Booking.com'
    return 'Direct'
}

const mapStatus = (status = '') => {
    const s = String(status).toLowerCase()
    if (['cancelled', 'canceled', 'declined', 'expired'].includes(s)) return 'cancelled'
    if (['pending', 'awaitingpayment', 'unconfirmed'].includes(s)) return 'pending'
    return 'confirmed'
}

const isInquiry = (status = '') => String(status).toLowerCase().startsWith('inquiry')

const toDate = (value) => {
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
    return isNaN(date) ? null : date
}

const mapListing = (l) => ({
    hostawayId: String(l.id),
    name: l.internalListingName || l.name || `Listing ${l.id}`,
    city: l.city || '',
    state: l.state || '',
    timezone: l.timeZoneName || 'America/New_York',
    bedrooms: Number(l.bedroomsNumber) || 1,
    maxGuests: Number(l.personCapacity) || undefined,
    basePrice: Number(l.price) || 0,
    cleaningFee: Number(l.cleaningFee) || 0,
    description: String(l.description || '').slice(0, 2000),
    image: l.thumbnailUrl || l.listingImages?.[0]?.url || '',
})

const mapReservation = (r, property) => {
    const channel = mapChannel(r.channelName)
    const checkIn = toDate(r.arrivalDate)
    const checkOut = toDate(r.departureDate)
    const nights = Number(r.nights) || Math.round((checkOut - checkIn) / DAY)
    const cleaningFee = Number(r.cleaningFee) || 0
    const total = Number(r.totalPrice) || 0
    const roomRevenue = Math.max(0, total - cleaningFee)
    const reportedFee = Number(r.hostChannelFee ?? r.channelCommissionAmount)
    return {
        hostawayId: String(r.id),
        property: property._id,
        type: String(r.status).toLowerCase() === 'ownerstay' ? 'owner_block' : 'guest',
        guestFirstName: r.guestFirstName || String(r.guestName || 'Guest').split(' ')[0],
        channel: String(r.status).toLowerCase() === 'ownerstay' ? 'Owner' : channel,
        checkIn,
        checkOut,
        nights,
        guests: Number(r.numberOfGuests) || 1,
        nightlyRate: nights ? round(roomRevenue / nights) : 0,
        roomRevenue: round(roomRevenue),
        cleaningFee: round(cleaningFee),
        otaFee: round(Number.isFinite(reportedFee) && reportedFee > 0 ? reportedFee : total * (FEE_RATE[channel] || 0)),
        status: mapStatus(r.status),
        bookedAt: r.reservationDate ? new Date(r.reservationDate) : new Date(),
    }
}

// ====== Upserts
const upsertListing = async (raw) => {
    const data = mapListing(raw)
    const existing = await propertySchema.findOne({ hostawayId: data.hostawayId })
    if (existing) {
        // Keep our own audit, owner, pricing limits and photo choice; refresh the facts
        Object.assign(existing, { name: data.name, city: data.city, state: data.state, timezone: data.timezone, bedrooms: data.bedrooms, maxGuests: data.maxGuests, cleaningFee: data.cleaningFee, description: existing.description || data.description, image: existing.image || data.image })
        await existing.save()
        return { property: existing, created: false }
    }
    const count = await propertySchema.countDocuments()
    const property = await propertySchema.create({
        ...data,
        code: `P${count + 1}`,
        tier: 'Starter',
        channels: [],
        minPrice: Math.round(data.basePrice * 0.7),
        maxPrice: Math.round(data.basePrice * 2.2),
        cleaningCost: Math.round(data.cleaningFee * 0.75),
        softwareCost: 30,
        audit: { scores: [], missingAmenities: [] },
    })
    return { property, created: true }
}

const upsertReservation = async (raw, property) => {
    if (isInquiry(raw.status)) return null
    const data = mapReservation(raw, property)
    if (!data.checkIn || !data.checkOut || data.checkOut <= data.checkIn) return null

    const existing = await reservationSchema.findOne({ hostawayId: data.hostawayId })
    if (existing) {
        Object.assign(existing, data)
        await existing.save()
        return existing
    }
    // Channel confirmation code when Hostaway has it, else a Hostaway-based code; never collide with another booking
    let code = String(raw.channelReservationId || raw.reservationId || `HW-${raw.id}`)
    if (await reservationSchema.exists({ code })) code = `${code}-HW${raw.id}`
    return reservationSchema.create({ ...data, code })
}

// ====== Record the result on the Integrations panel
const recordStatus = async (ok, error) => {
    const update = ok
        ? { lastSyncAt: new Date(), lastSuccessAt: new Date(), lastStatus: 200, lastError: '' }
        : { lastSyncAt: new Date(), lastStatus: error?.status || 500, lastError: String(error?.message || 'Sync failed').slice(0, 300) }
    await integrationSchema.findOneAndUpdate(
        { name: INTEGRATION_NAME },
        { $set: update, $setOnInsert: { category: 'PMS', feeds: ['Reservations', 'Listings'], mode: 'webhook', staleAfterMin: 60 } },
        { upsert: true }
    )
}

// ====== Full sync: listings, then reservations departing from 90 days ago onwards
const syncAll = async () => {
    if (!isConfigured()) return { ok: false, message: 'Hostaway is not configured' }
    if (syncing) return { ok: false, message: 'A sync is already running' }
    syncing = true
    const summary = { listings: 0, newListings: 0, reservations: 0, skipped: 0 }
    try {
        const listings = await fetchAll('/listings')
        const byHostawayId = {}
        for (const raw of listings) {
            const { property, created } = await upsertListing(raw)
            byHostawayId[String(raw.id)] = property
            summary.listings += 1
            if (created) summary.newListings += 1
        }

        const from = new Date(startOfToday().getTime() - 90 * DAY).toISOString().slice(0, 10)
        const reservations = await fetchAll('/reservations', { departureStartDate: from, sortOrder: 'arrivalDate' })
        for (const raw of reservations) {
            const property = byHostawayId[String(raw.listingMapId)]
            const saved = property ? await upsertReservation(raw, property) : null
            if (saved) summary.reservations += 1
            else summary.skipped += 1
        }

        await recordStatus(true)
        return { ok: true, message: `Synced ${summary.listings} listings and ${summary.reservations} reservations.`, summary }
    } catch (error) {
        console.log('Hostaway sync failed:', error.message)
        await recordStatus(false, error)
        return { ok: false, message: error.message, summary }
    } finally {
        syncing = false
    }
}

// ====== One reservation from a webhook (fetches the listing if we have not seen it yet)
const applyReservationEvent = async (raw) => {
    if (!raw?.id || !raw?.listingMapId) return { ok: false, message: 'Payload has no reservation id or listing' }
    let property = await propertySchema.findOne({ hostawayId: String(raw.listingMapId) })
    if (!property && isConfigured()) {
        const json = await apiGet(`/listings/${raw.listingMapId}`)
        if (json?.result) property = (await upsertListing(json.result)).property
    }
    if (!property) return { ok: false, message: 'Unknown listing' }
    const saved = await upsertReservation(raw, property)
    await recordStatus(true)
    return { ok: true, message: saved ? `Reservation ${saved.code} saved.` : 'Inquiry ignored.' }
}

// ====== Scheduler: full sync on start and every HOSTAWAY_SYNC_MINUTES
const startHostawaySync = () => {
    if (!isConfigured()) return
    const minutes = Math.max(5, Number(process.env.HOSTAWAY_SYNC_MINUTES) || 15)
    console.log(`Hostaway sync on: every ${minutes} min.`)
    setTimeout(() => syncAll().then((r) => console.log('Hostaway:', r.message)), 5000)
    setInterval(() => syncAll().then((r) => console.log('Hostaway:', r.message)), minutes * 60 * 1000)
}

module.exports = { isConfigured, syncAll, applyReservationEvent, startHostawaySync, mapReservation, mapChannel, mapStatus }
