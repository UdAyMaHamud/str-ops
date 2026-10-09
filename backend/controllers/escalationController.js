const escalationSchema = require('../models/escalationSchema')
const contactSchema = require('../models/contactSchema')
const { propertyFilter } = require('../services/helpers')

// ====== Get Contacts (escalation list)
const getContacts = async (req, res) => {
    try {
        const contacts = await contactSchema.find().sort({ order: 1 })
        return res.status(200).send({ success: true, message: 'Contacts fetched.', data: contacts })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get Escalations
const getEscalations = async (req, res) => {
    try {
        const escalations = await escalationSchema
            .find(propertyFilter(req))
            .populate('property', 'code name')
            .populate('createdBy', 'fullName role')
            .populate('resolvedBy', 'fullName')
            .sort({ status: 1, createdAt: -1 })
        return res.status(200).send({ success: true, message: 'Escalations fetched.', data: escalations })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Create Escalation (anyone: stop and escalate)
const createEscalation = async (req, res) => {
    try {
        const { urgency, property, reservationCode, whatHappened, alreadyDid, need, suggestion } = req.body
        if (!property) return res.status(400).send({ success: false, message: 'Property is required' })
        if (!whatHappened || !whatHappened.trim()) return res.status(400).send({ success: false, message: 'Describe what happened' })
        // Guest PII rule: a reservation code only, never a phone number
        if (/\+?\d[\d\s().-]{8,}\d/.test(`${whatHappened} ${alreadyDid} ${suggestion}`))
            return res.status(400).send({ success: false, message: 'Looks like a phone number. Use the reservation code instead.' })

        const escalation = await escalationSchema.create({
            urgency, property, reservationCode, whatHappened, alreadyDid, need, suggestion, createdBy: req.user._id,
        })
        return res.status(201).send({ success: true, message: 'Escalation sent to the ops channel.', data: escalation })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Resolve Escalation (senior only)
const resolveEscalation = async (req, res) => {
    try {
        const escalation = await escalationSchema.findByIdAndUpdate(
            req.params.id,
            { status: 'resolved', resolvedBy: req.user._id },
            { returnDocument: 'after' }
        )
        if (!escalation) return res.status(404).send({ success: false, message: 'Escalation not found' })
        return res.status(200).send({ success: true, message: 'Escalation resolved.', data: escalation })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getContacts, getEscalations, createEscalation, resolveEscalation }
