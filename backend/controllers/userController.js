const userSchema = require('../models/userSchema')
const propertySchema = require('../models/propertySchema')

const ROLES = ['guest', 'client', 'trainee', 'senior', 'admin']

// ====== Get Users (admin)
const getUsers = async (req, res) => {
    try {
        const { role, search } = req.query
        const query = {}
        if (role && ROLES.includes(role)) query.role = role
        if (search) query.$or = [{ fullName: { $regex: String(search), $options: 'i' } }, { email: { $regex: String(search), $options: 'i' } }]

        const users = await userSchema.find(query).select('-password -otp -otpExpire').sort({ createdAt: -1 })
        const properties = await propertySchema.find().select('owner code')
        const data = users.map((u) => ({
            ...u.toObject(),
            properties: properties.filter((p) => String(p.owner) === String(u._id)).map((p) => p.code),
        }))
        return res.status(200).send({ success: true, message: 'Users fetched.', data })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Change Role (admin). This is how staff accounts are made: sign up, then an admin promotes.
const updateRole = async (req, res) => {
    try {
        const { role, track = '' } = req.body
        if (!ROLES.includes(role)) return res.status(400).send({ success: false, message: 'Invalid role' })
        if (String(req.params.id) === String(req.user._id))
            return res.status(400).send({ success: false, message: 'You cannot change your own role' })

        const user = await userSchema.findById(req.params.id)
        if (!user) return res.status(404).send({ success: false, message: 'User not found' })

        const owns = await propertySchema.countDocuments({ owner: user._id })
        if (user.role === 'client' && role !== 'client' && owns)
            return res.status(400).send({ success: false, message: 'This owner still has properties. Move them first.' })

        user.role = role
        if (track) user.track = String(track).trim()
        // New trainees start the 30-day academy today
        if (role === 'trainee' && !user.trainingStart) user.trainingStart = new Date()
        await user.save()

        return res.status(200).send({ success: true, message: `${user.fullName} is now ${role}.`, data: { _id: user._id, role: user.role } })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getUsers, updateRole }
