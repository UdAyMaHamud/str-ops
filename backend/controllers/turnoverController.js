const turnoverSchema = require('../models/turnoverSchema')
const { dayOffset, propertyFilter } = require('../services/helpers')

// ====== Get Turnovers (last 7 days to next 3 days)
const getTurnovers = async (req, res) => {
    try {
        const turnovers = await turnoverSchema
            .find({ ...propertyFilter(req), scheduledFor: { $gte: dayOffset(-7), $lt: dayOffset(4) } })
            .populate('property', 'code name timezone')
            .sort({ scheduledFor: -1 })
        return res.status(200).send({ success: true, message: 'Turnovers fetched.', data: turnovers })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Turnover QC (senior only)
const updateTurnoverQc = async (req, res) => {
    try {
        const { qcStatus, qcReason = '' } = req.body
        if (!['approved', 'rejected'].includes(qcStatus))
            return res.status(400).send({ success: false, message: 'QC status must be approved or rejected' })
        if (qcStatus === 'rejected' && !qcReason.trim())
            return res.status(400).send({ success: false, message: 'Give a reason when rejecting' })

        const turnover = await turnoverSchema.findById(req.params.id)
        if (!turnover) return res.status(404).send({ success: false, message: 'Turnover not found' })
        if (turnover.status !== 'done') return res.status(400).send({ success: false, message: 'Cleaning is not finished yet' })

        turnover.qcStatus = qcStatus
        turnover.qcReason = qcReason.trim()
        await turnover.save()
        return res.status(200).send({ success: true, message: `Photo QC ${qcStatus}.`, data: turnover })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getTurnovers, updateTurnoverQc }
