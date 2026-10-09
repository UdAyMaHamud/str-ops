const userSchema = require('../models/userSchema')
const eodSchema = require('../models/eodSchema')
const { DAY_CARDS, getProgress } = require('../services/trainingPlan')
const { buildTeam } = require('../services/team')
const { startOfToday } = require('../services/helpers')

const isTrainer = (user) => ['senior', 'admin'].includes(user.role)

// ====== Get Training Plan + progress (trainee: self, trainer: ?user=<id>)
const getTraining = async (req, res) => {
    try {
        let trainee = req.user
        if (isTrainer(req.user) && req.query.user) trainee = await userSchema.findById(req.query.user)
        if (!trainee) return res.status(404).send({ success: false, message: 'Trainee not found' })

        return res.status(200).send({
            success: true,
            message: 'Training fetched.',
            data: { plan: DAY_CARDS, progress: getProgress(trainee), trainee: { _id: trainee._id, fullName: trainee.fullName, track: trainee.track } },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get EOD reports (trainees see their own, trainers see everyone)
const getEods = async (req, res) => {
    try {
        const query = {}
        if (req.user.role === 'trainee') query.user = req.user._id
        else if (req.query.user) query.user = req.query.user

        const eods = await eodSchema
            .find(query)
            .populate('user', 'fullName track')
            .populate('reviewedBy', 'fullName')
            .sort({ date: -1, createdAt: -1 })
            .limit(60)
        return res.status(200).send({ success: true, message: 'EOD reports fetched.', data: eods })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Post today's EOD report (trainee only, one per day: posting again updates it)
const createEod = async (req, res) => {
    try {
        const { hoursWorked, tasks, submitted, learned = [], blocker = '', question = '', confidence, tomorrowCardRead } = req.body
        if (!Number(hoursWorked) || Number(hoursWorked) > 16) return res.status(400).send({ success: false, message: 'Hours worked must be between 1 and 16' })
        if (!tasks || !String(tasks).trim()) return res.status(400).send({ success: false, message: 'Write how your tasks went (done / partly)' })
        const lessons = (Array.isArray(learned) ? learned : []).map((l) => String(l).trim()).filter(Boolean)
        if (lessons.length < 3) return res.status(400).send({ success: false, message: 'Write 3 things you learned' })
        if (!(Number(confidence) >= 1 && Number(confidence) <= 5)) return res.status(400).send({ success: false, message: 'Confidence must be 1 to 5' })

        const progress = getProgress(req.user)
        const date = startOfToday()
        const eod = await eodSchema.findOneAndUpdate(
            { user: req.user._id, date },
            {
                user: req.user._id,
                date,
                day: progress?.day,
                hoursWorked: Number(hoursWorked),
                tasks: String(tasks).trim(),
                submitted: String(submitted || '').trim(),
                learned: lessons.slice(0, 3),
                blocker: String(blocker).trim(),
                question: String(question).trim(),
                confidence: Number(confidence),
                tomorrowCardRead: !!tomorrowCardRead,
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        )
        return res.status(201).send({ success: true, message: 'EOD report posted. Day counted.', data: eod })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Trainer feedback on an EOD report (senior / admin)
const reviewEod = async (req, res) => {
    try {
        const { note } = req.body
        if (!note || !String(note).trim()) return res.status(400).send({ success: false, message: 'Write a short note for the trainee' })
        const eod = await eodSchema.findByIdAndUpdate(
            req.params.id,
            { reviewNote: String(note).trim(), reviewedBy: req.user._id, reviewedAt: new Date() },
            { returnDocument: 'after' }
        )
        if (!eod) return res.status(404).send({ success: false, message: 'EOD report not found' })
        return res.status(200).send({ success: true, message: 'Feedback saved.', data: eod })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Team overview for trainers: one row per trainee
const getTeam = async (req, res) => {
    try {
        const data = await buildTeam()
        return res.status(200).send({ success: true, message: 'Team fetched.', data })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getTraining, getEods, createEod, reviewEod, getTeam }
