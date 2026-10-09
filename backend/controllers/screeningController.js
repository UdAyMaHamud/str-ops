const screeningSchema = require('../models/screeningSchema')
const { propertyFilter } = require('../services/helpers')

// ====== Get Screenings (Screening Decision Log, Day 9)
const getScreenings = async (req, res) => {
    try {
        const screenings = await screeningSchema
            .find(propertyFilter(req))
            .populate('property', 'code name')
            .populate('decidedBy', 'fullName')
            .sort({ checkIn: 1 })
        return res.status(200).send({ success: true, message: 'Screenings fetched.', data: screenings })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Screening decision (senior only)
const updateScreening = async (req, res) => {
    try {
        const { decision, reason = '', followUp = '' } = req.body
        if (!['approve', 'investigate', 'decline'].includes(decision))
            return res.status(400).send({ success: false, message: 'Decision must be approve, investigate or decline' })
        // A score is a signal, not a decision: investigate/decline need a real reason
        if (decision !== 'approve' && reason.trim().length < 10)
            return res.status(400).send({ success: false, message: 'Write a one-line reason for the owner (not just the score)' })

        const screening = await screeningSchema.findById(req.params.id)
        if (!screening) return res.status(404).send({ success: false, message: 'Screening not found' })

        screening.decision = decision
        screening.reason = reason.trim()
        screening.followUp = followUp.trim()
        screening.decidedBy = req.user._id
        await screening.save()
        return res.status(200).send({ success: true, message: 'Decision saved.', data: screening })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getScreenings, updateScreening }
