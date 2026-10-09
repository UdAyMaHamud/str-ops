const mongoose = require('mongoose')

const integrationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        category: { type: String },
        feeds: [{ type: String }],
        mode: { type: String, enum: ['webhook', 'polling'] },
        intervalMin: { type: Number, default: 0 },
        staleAfterMin: { type: Number },
        lastSyncAt: { type: Date },
        lastSuccessAt: { type: Date },
        lastStatus: { type: Number },
        lastError: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('integration', integrationSchema)
