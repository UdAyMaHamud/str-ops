const reviewSchema = require('../models/reviewSchema')
const claimSchema = require('../models/claimSchema')
const { DAY, round, propertyFilter } = require('../services/helpers')

const CLAIM_CHECKS = {
    checkInPhotos: 'Check-in photos (before)',
    checkoutPhotos: 'Checkout photos (after)',
    timeline: 'Timeline with dates and times',
    guestMessages: 'Guest messages about the issue',
    repairQuote: 'Repair quote or receipt',
    filedInTime: 'Filed within the platform deadline',
    firstMessage: 'Polite first message to guest',
}

// ====== Get Reviews
const getReviews = async (req, res) => {
    try {
        const reviews = await reviewSchema.find(propertyFilter(req)).populate('property', 'code name').sort({ postedAt: -1 })
        const negative = reviews.filter((r) => r.rating <= 3)
        return res.status(200).send({
            success: true,
            message: 'Reviews fetched.',
            data: reviews,
            stats: {
                count: reviews.length,
                avgRating: round(reviews.reduce((s, r) => s + r.rating, 0) / (reviews.length || 1), 2),
                negative: negative.length,
                negativeUnreplied: negative.filter((r) => !r.reply).length,
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get Claims (with deadline countdown + Claim Pack progress)
const getClaims = async (req, res) => {
    try {
        const claims = await claimSchema.find(propertyFilter(req)).populate('property', 'code name').sort({ deadline: 1 })
        const data = claims.map((c) => {
            const done = Object.keys(CLAIM_CHECKS).filter((k) => c.checklist?.[k]).length
            return {
                ...c.toObject(),
                daysLeft: Math.ceil((new Date(c.deadline) - Date.now()) / DAY),
                checklistDone: done,
                checklistTotal: Object.keys(CLAIM_CHECKS).length,
            }
        })
        return res.status(200).send({ success: true, message: 'Claims fetched.', data, checks: CLAIM_CHECKS })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Claim checklist / status (senior only)
const updateClaim = async (req, res) => {
    try {
        const { check, value, status } = req.body
        const claim = await claimSchema.findById(req.params.id)
        if (!claim) return res.status(404).send({ success: false, message: 'Claim not found' })

        if (check) {
            if (!CLAIM_CHECKS[check]) return res.status(400).send({ success: false, message: 'Unknown checklist item' })
            claim.checklist[check] = !!value
        }
        if (status) {
            if (!['open', 'filed', 'paid', 'denied'].includes(status))
                return res.status(400).send({ success: false, message: 'Invalid status' })
            claim.status = status
        }
        await claim.save()
        return res.status(200).send({ success: true, message: 'Claim updated.', data: claim })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getReviews, getClaims, updateClaim }
