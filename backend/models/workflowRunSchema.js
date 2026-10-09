const mongoose = require('mongoose')

const workflowRunSchema = new mongoose.Schema(
    {
        workflow: { type: String, required: true },
        status: { type: String, enum: ['success', 'error'] },
        startedAt: { type: Date },
        durationMs: { type: Number },
        errorCause: { type: String, default: '' },
        message: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('workflowrun', workflowRunSchema)
