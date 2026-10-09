const userSchema = require('../models/userSchema')
const draftSchema = require('../models/draftSchema')
const eodSchema = require('../models/eodSchema')
const { getProgress } = require('./trainingPlan')
const { startOfToday, round } = require('./helpers')

// ====== One row per trainee: day card, draft approval rate, EOD status (used by seniors and admins)
const buildTeam = async () => {
    const trainees = await userSchema.find({ role: 'trainee' }).select('fullName email track trainingStart')
    const today = startOfToday()

    return Promise.all(
        trainees.map(async (t) => {
            const drafts = await draftSchema.find({ author: t._id })
            const reviewed = drafts.filter((d) => d.status !== 'pending')
            const ok = reviewed.filter((d) => ['approved', 'edited'].includes(d.status)).length
            const eods = await eodSchema.find({ user: t._id }).sort({ date: -1 }).limit(5)
            const lastEod = eods[0]
            return {
                _id: t._id,
                fullName: t.fullName,
                email: t.email,
                track: t.track,
                progress: getProgress(t),
                drafts: {
                    total: drafts.length,
                    pending: drafts.length - reviewed.length,
                    reviewed: reviewed.length,
                    rejected: reviewed.filter((d) => d.status === 'rejected').length,
                    approvalRate: reviewed.length ? round(ok / reviewed.length, 4) : null,
                },
                eodToday: !!lastEod && new Date(lastEod.date).getTime() === today.getTime(),
                lastEod: lastEod ? { date: lastEod.date, confidence: lastEod.confidence, blocker: lastEod.blocker } : null,
                confidenceTrend: eods.map((e) => e.confidence).reverse(),
            }
        })
    )
}

module.exports = { buildTeam }
