const integrationSchema = require('../models/integrationSchema')
const workflowRunSchema = require('../models/workflowRunSchema')
const { integrationHealth, STATUS_MEANING } = require('../services/health')
const { DAY } = require('../services/helpers')

// ====== Get Integrations (health per tool)
const getIntegrations = async (req, res) => {
    try {
        const integrations = await integrationSchema.find().sort({ category: 1, name: 1 })
        const data = integrations.map((i) => ({ ...i.toObject(), health: integrationHealth(i) }))
        return res.status(200).send({ success: true, message: 'Integrations fetched.', data, statusCodes: STATUS_MEANING })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

// ====== Get Workflow Runs (n8n health + 7-day error log grouped by cause)
const getWorkflowRuns = async (req, res) => {
    try {
        const runs = await workflowRunSchema.find({ startedAt: { $gte: new Date(Date.now() - 7 * DAY) } }).sort({ startedAt: -1 })

        const workflows = {}
        const causes = {}
        runs.forEach((r) => {
            if (!workflows[r.workflow]) workflows[r.workflow] = { workflow: r.workflow, runs: 0, errors: 0, lastRunAt: r.startedAt, lastStatus: r.status }
            workflows[r.workflow].runs += 1
            if (r.status === 'error') {
                workflows[r.workflow].errors += 1
                if (!causes[r.errorCause]) causes[r.errorCause] = { cause: r.errorCause, count: 0, workflows: [], lastSeenAt: r.startedAt, example: r.message }
                causes[r.errorCause].count += 1
                if (!causes[r.errorCause].workflows.includes(r.workflow)) causes[r.errorCause].workflows.push(r.workflow)
            }
        })

        return res.status(200).send({
            success: true,
            message: 'Workflow runs fetched.',
            data: {
                workflows: Object.values(workflows),
                errorsByCause: Object.values(causes).sort((a, b) => b.count - a.count),
                recentErrors: runs.filter((r) => r.status === 'error').slice(0, 10),
                totals: { runs: runs.length, errors: runs.filter((r) => r.status === 'error').length },
            },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
}

module.exports = { getIntegrations, getWorkflowRuns }
