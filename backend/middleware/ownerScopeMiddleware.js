const propertySchema = require('../models/propertySchema')

// Clients (property owners) only ever see their own properties
const ownerScope = async (req, res, next) => {
    try {
        if (req.user?.role === 'client') {
            const owned = await propertySchema.find({ owner: req.user._id }).select('_id')
            req.ownedProperties = owned.map((p) => String(p._id))
        }
        next()
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = ownerScope
