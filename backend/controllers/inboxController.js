const threadSchema = require('../models/threadSchema')
const draftSchema = require('../models/draftSchema')
const { round, propertyFilter } = require('../services/helpers')

// ====== Get Threads (unified inbox)
const getThreads = async (req, res) => {
    try {
        const threads = await threadSchema.find(propertyFilter(req)).populate('property', 'code name timezone')

        // Response time = minutes from a guest message to the next host message
        const responseTimes = []
        let guestMessages = 0
        let answered = 0
        threads.forEach((t) => {
            t.messages.forEach((m, i) => {
                if (m.sender !== 'guest') return
                const reply = t.messages.slice(i + 1).find((n) => n.sender === 'host')
                // Response rate = replied within 24 h; messages still inside the window are not missed yet
                if (!reply && Date.now() - new Date(m.sentAt) < 24 * 60 * 60000) return
                guestMessages += 1
                if (reply) {
                    answered += 1
                    responseTimes.push((new Date(reply.sentAt) - new Date(m.sentAt)) / 60000)
                }
            })
        })

        const waiting = threads
            .filter((t) => t.needsReply)
            .map((t) => Math.round((Date.now() - new Date(t.messages[t.messages.length - 1]?.sentAt)) / 60000))

        const sorted = threads.sort((a, b) => {
            if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1
            return new Date(b.messages[b.messages.length - 1]?.sentAt) - new Date(a.messages[a.messages.length - 1]?.sentAt)
        })

        return res.status(200).send({
            success: true,
            message: 'Threads fetched.',
            data: sorted,
            stats: {
                avgResponseMin: round(responseTimes.reduce((s, n) => s + n, 0) / (responseTimes.length || 1), 1),
                responseRate: round(guestMessages ? answered / guestMessages : 1, 4),
                waiting: waiting.length,
                oldestWaitingMin: waiting.length ? Math.max(...waiting) : 0,
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get Drafts (Draft Log, Day 20)
const getDrafts = async (req, res) => {
    try {
        const drafts = await draftSchema
            .find(propertyFilter(req))
            .populate('property', 'code name')
            .populate('author', 'fullName role')
            .populate('reviewer', 'fullName role')
            .sort({ createdAt: -1 })

        const reviewed = drafts.filter((d) => d.status !== 'pending')
        const approved = reviewed.filter((d) => d.status === 'approved').length
        const edited = reviewed.filter((d) => d.status === 'edited').length

        return res.status(200).send({
            success: true,
            message: 'Drafts fetched.',
            data: drafts,
            stats: {
                pending: drafts.length - reviewed.length,
                reviewed: reviewed.length,
                approvalRate: round(reviewed.length ? (approved + edited) / reviewed.length : 0, 4),
                cleanApprovalRate: round(reviewed.length ? approved / reviewed.length : 0, 4),
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Create Draft (anyone signed in; nothing is sent)
const createDraft = async (req, res) => {
    try {
        const { threadId, type = 'reply', body } = req.body
        if (!threadId) return res.status(400).send({ success: false, message: 'Thread is required' })
        if (!body || !body.trim()) return res.status(400).send({ success: false, message: 'Draft text is required' })

        const thread = await threadSchema.findById(threadId)
        if (!thread) return res.status(404).send({ success: false, message: 'Thread not found' })

        const draft = await draftSchema.create({
            thread: thread._id,
            property: thread.property,
            reservationCode: thread.reservationCode,
            type,
            body: body.trim(),
            author: req.user._id,
        })

        return res.status(201).send({ success: true, message: 'Draft saved. A senior will review it.', data: draft })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Review Draft (senior only)
const reviewDraft = async (req, res) => {
    try {
        const { status, feedback = '', finalBody = '' } = req.body
        if (!['approved', 'edited', 'rejected'].includes(status))
            return res.status(400).send({ success: false, message: 'Status must be approved, edited or rejected' })
        if (status === 'edited' && !finalBody.trim())
            return res.status(400).send({ success: false, message: 'Edited drafts need the final text' })
        if (status === 'rejected' && !feedback.trim())
            return res.status(400).send({ success: false, message: 'Rejected drafts need feedback for the trainee' })

        const draft = await draftSchema.findById(req.params.id)
        if (!draft) return res.status(404).send({ success: false, message: 'Draft not found' })
        if (draft.status !== 'pending') return res.status(400).send({ success: false, message: 'Draft was already reviewed' })

        draft.status = status
        draft.feedback = feedback.trim()
        draft.finalBody = status === 'edited' ? finalBody.trim() : status === 'approved' ? draft.body : ''
        draft.reviewer = req.user._id
        draft.reviewedAt = new Date()
        await draft.save()

        // Staging: an approved reply is added to the thread instead of going to a real guest
        if (status !== 'rejected' && draft.type === 'reply') {
            await threadSchema.findByIdAndUpdate(draft.thread, {
                $push: { messages: { sender: 'host', body: draft.finalBody, sentAt: new Date() } },
                needsReply: false,
            })
        }

        return res.status(200).send({ success: true, message: `Draft ${status}.`, data: draft })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getThreads, getDrafts, createDraft, reviewDraft }
