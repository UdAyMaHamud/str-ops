const alertSchema = require('../models/alertSchema')
const { DAY, propertyFilter } = require('../services/helpers')

// ====== Get Alerts (Minut, Domotz, smart lock)
const getAlerts = async (req, res) => {
    try {
        const alerts = await alertSchema
            .find({ ...propertyFilter(req), raisedAt: { $gte: new Date(Date.now() - 7 * DAY) } })
            .populate('property', 'code name timezone')
            .sort({ raisedAt: -1 })
        return res.status(200).send({ success: true, message: 'Alerts fetched.', data: alerts })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Alert status (senior only)
const updateAlert = async (req, res) => {
    try {
        const { status } = req.body
        if (!['open', 'acknowledged', 'resolved'].includes(status))
            return res.status(400).send({ success: false, message: 'Invalid status' })
        const alert = await alertSchema.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' })
        if (!alert) return res.status(404).send({ success: false, message: 'Alert not found' })
        return res.status(200).send({ success: true, message: `Alert ${status}.`, data: alert })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getAlerts, updateAlert }
