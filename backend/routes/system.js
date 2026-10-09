const express = require('express')
const integrationSchema = require('../models/integrationSchema')
const { authMiddleware } = require('../middleware/authMiddleware')
const roleCheck = require('../middleware/roleCheckMiddleware')
const { syncAll } = require('../services/hostawayService')

const route = express.Router()

// ====== Environment info for the staging / production banner
route.get('/info', (req, res) => {
    res.status(200).send({
        success: true,
        message: 'System info fetched.',
        data: { env: process.env.APP_ENV || 'staging', teamTimezone: 'Asia/Dhaka' },
    })
})

// ====== Go-live checklist (admin). Reports only whether things are set, never the values.
route.get('/setup', authMiddleware, roleCheck('admin'), async (req, res) => {
    try {
        const dbString = process.env.DB_STRING || ''
        const hostaway = await integrationSchema.findOne({ name: 'Hostaway (PMS)' })
        const hostawayLive = !!(process.env.HOSTAWAY_ACCOUNT_ID && process.env.HOSTAWAY_API_KEY)

        const steps = [
            {
                key: 'database',
                title: 'Real database (MongoDB Atlas)',
                done: !!dbString,
                detail: dbString ? (dbString.startsWith('mongodb+srv://') ? 'Connected to MongoDB Atlas.' : 'Connected to the MongoDB in DB_STRING.') : 'Using the local database in backend/.data. Set DB_STRING for a hosted one.',
            },
            {
                key: 'email',
                title: 'Email codes (Gmail SMTP)',
                done: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
                detail: process.env.SMTP_USER ? 'Verification and reset codes are emailed.' : 'Codes are printed in the API console. Set SMTP_USER and SMTP_PASS.',
            },
            {
                key: 'google',
                title: 'Continue with Google',
                done: !!process.env.GOOGLE_CLIENT_ID,
                detail: process.env.GOOGLE_CLIENT_ID ? 'Google sign-in is on (also needs VITE_GOOGLE_CLIENT_ID in the frontend).' : 'Set GOOGLE_CLIENT_ID here and VITE_GOOGLE_CLIENT_ID in the frontend.',
            },
            {
                key: 'secret',
                title: 'Strong JWT secret',
                done: !!process.env.JWT_SECRET && !process.env.JWT_SECRET.startsWith('change_me') && process.env.JWT_SECRET.length >= 32,
                detail: 'Use a random string of 32+ characters in JWT_SECRET.',
            },
            {
                key: 'hostaway',
                title: 'Hostaway connected',
                done: hostawayLive && hostaway?.lastStatus === 200,
                detail: !hostawayLive
                    ? 'Set HOSTAWAY_ACCOUNT_ID and HOSTAWAY_API_KEY to sync real listings and reservations.'
                    : hostaway?.lastStatus === 200
                      ? `Last sync ${hostaway.lastSyncAt ? new Date(hostaway.lastSyncAt).toISOString() : 'never'}.`
                      : `Credentials set but the last sync failed: ${hostaway?.lastError || 'not run yet'}`,
            },
            {
                key: 'mock',
                title: 'Mock data switched off',
                done: process.env.SEED_MOCK === 'false',
                detail: process.env.SEED_MOCK === 'false' ? 'Only real data is loaded.' : 'Set SEED_MOCK=false once real data flows in, then start from an empty database.',
            },
        ]

        return res.status(200).send({
            success: true,
            message: 'Setup status fetched.',
            data: { steps, done: steps.filter((s) => s.done).length, total: steps.length, env: process.env.APP_ENV || 'staging' },
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
})

// ====== Scheduled sync (Vercel Cron sends Authorization: Bearer <CRON_SECRET>)
route.get('/hostaway/cron', async (req, res) => {
    try {
        const secret = process.env.CRON_SECRET
        if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).send({ success: false, message: 'Unauthorized' })
        const result = await syncAll()
        return res.status(200).send({ success: result.ok, message: result.message })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
})

// ====== Run a Hostaway sync now (admin)
route.post('/hostaway/sync', authMiddleware, roleCheck('admin'), async (req, res) => {
    try {
        const result = await syncAll()
        return res.status(result.ok ? 200 : 400).send({ success: result.ok, message: result.message, data: result.summary })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ success: false, message: 'Internal server error' })
    }
})

module.exports = route
