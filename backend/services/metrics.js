const { DAY, round } = require('./helpers')

// ====== Nights of a reservation that fall inside [start, end)
const nightsInRange = (reservation, start, end) => {
    const from = Math.max(new Date(reservation.checkIn).getTime(), start.getTime())
    const to = Math.min(new Date(reservation.checkOut).getTime(), end.getTime())
    return Math.max(0, Math.round((to - from) / DAY))
}

// ====== Occupancy, ADR, RevPAR, revenue and host net for a period (workbook Day 1)
const calcKpis = (reservations, properties, start, end) => {
    const days = Math.round((end - start) / DAY)
    const propertyMap = {}
    properties.forEach((p) => (propertyMap[String(p._id)] = p))

    let blockedNights = 0
    let bookedNights = 0
    let roomRevenue = 0
    let cleaningFees = 0
    let cleaningCost = 0
    let otaFees = 0
    let stays = 0
    let turnovers = 0
    const channelNights = {}

    for (const r of reservations) {
        const nights = nightsInRange(r, start, end)
        if (!nights) continue
        if (r.type === 'owner_block') {
            blockedNights += nights
            continue
        }
        // Only confirmed stays earn money; pending requests and cancellations do not
        if (r.status !== 'confirmed') continue

        const share = nights / (r.nights || nights)
        bookedNights += nights
        roomRevenue += r.roomRevenue * share
        otaFees += r.otaFee * share
        channelNights[r.channel] = (channelNights[r.channel] || 0) + nights
        if (new Date(r.checkIn) >= start) stays += 1

        // Cleaning is counted on the checkout date
        const checkOut = new Date(r.checkOut)
        if (checkOut > start && checkOut <= end) {
            cleaningFees += r.cleaningFee
            cleaningCost += propertyMap[String(r.property?._id || r.property)]?.cleaningCost || 0
            turnovers += 1
        }
    }

    const availableNights = properties.length * days - blockedNights
    const softwareCost = properties.reduce((sum, p) => sum + (p.softwareCost || 0), 0) * (days / 30)
    const totalRevenue = roomRevenue + cleaningFees
    const hostNet = totalRevenue - otaFees - cleaningCost - softwareCost

    // Market benchmark = simple average of the properties' market numbers
    const marketOccupancy = properties.reduce((s, p) => s + (p.marketOccupancy || 0), 0) / (properties.length || 1)
    const marketAdr = properties.reduce((s, p) => s + (p.marketAdr || 0), 0) / (properties.length || 1)

    return {
        days,
        availableNights,
        bookedNights,
        blockedNights,
        stays,
        turnovers,
        occupancy: round(availableNights ? bookedNights / availableNights : 0, 4),
        adr: round(bookedNights ? roomRevenue / bookedNights : 0),
        revpar: round(availableNights ? roomRevenue / availableNights : 0),
        roomRevenue: round(roomRevenue),
        cleaningFees: round(cleaningFees),
        totalRevenue: round(totalRevenue),
        otaFees: round(otaFees),
        cleaningCost: round(cleaningCost),
        softwareCost: round(softwareCost),
        hostNet: round(hostNet),
        avgLengthOfStay: round(stays ? bookedNights / stays : 0, 1),
        channelNights,
        market: {
            occupancy: round(marketOccupancy, 4),
            adr: round(marketAdr),
            revpar: round(marketOccupancy * marketAdr),
        },
    }
}

module.exports = { nightsInRange, calcKpis }
