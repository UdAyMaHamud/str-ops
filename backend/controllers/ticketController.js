const ticketSchema = require('../models/ticketSchema')
const { propertyFilter } = require('../services/helpers')

// ====== Get Tickets (maintenance)
const getTickets = async (req, res) => {
    try {
        const urgencyOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const tickets = await ticketSchema.find(propertyFilter(req)).populate('property', 'code name timezone')
        const data = tickets.sort((a, b) => {
            if ((a.status === 'closed') !== (b.status === 'closed')) return a.status === 'closed' ? 1 : -1
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
        })
        return res.status(200).send({ success: true, message: 'Tickets fetched.', data })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Update Ticket (senior only)
const updateTicket = async (req, res) => {
    try {
        const { status, note = '' } = req.body
        if (!['open', 'assigned', 'in_progress', 'closed'].includes(status))
            return res.status(400).send({ success: false, message: 'Invalid status' })

        const ticket = await ticketSchema.findById(req.params.id)
        if (!ticket) return res.status(404).send({ success: false, message: 'Ticket not found' })

        ticket.status = status
        if (status === 'closed') ticket.closedAt = new Date()
        ticket.updates.push({ note: note.trim() || `Status changed to ${status.replace('_', ' ')}`, at: new Date() })
        await ticket.save()
        return res.status(200).send({ success: true, message: 'Ticket updated.', data: ticket })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getTickets, updateTicket }
