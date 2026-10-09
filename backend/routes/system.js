const express = require('express')
const integrationSchema = require('../models/integrationSchema')
const { authMiddleware } = require('../middleware/authMiddleware')
const roleCheck = require('../middleware/roleCheckMiddleware')
const { syncAll } = require('../services/hostawayService')
const propertySchema = require('../models/propertySchema')
const { seedDatabase } = require('../services/seed')

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
        const userSchema = require('../models/userSchema')
        const demoAccounts = await userSchema.countDocuments({ email: /@strops.test$/ })
        const isProduction = process.env.NODE_ENV === 'production'
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
                detail: process.env.SMTP_USER
                    ? 'Verification and reset codes are emailed.'
                    : isProduction
                      ? 'New sign-ups cannot verify their email yet. Set SMTP_USER and SMTP_PASS.'
                      : 'Codes are printed in the API console. Set SMTP_USER and SMTP_PASS.',
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
                title: 'Demo data removed',
                done: process.env.SEED_MOCK === 'false' && demoAccounts === 0,
                detail: demoAccounts
                    ? `${demoAccounts} demo accounts (@strops.test) and their sample data are still in the database. Remove them before real users join.`
                    : process.env.SEED_MOCK === 'false'
                      ? 'Only real data is in the database.'
                      : 'Set SEED_MOCK=false so demo data is never loaded again.',
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

// ====== One-time demo data load for hosted databases (no shell access on Vercel).
// Works only while SEED_TOKEN is set and only on an empty database; remove SEED_TOKEN afterwards.
route.post('/seed', async (req, res) => {
    try {
        const token = process.env.SEED_TOKEN
        if (!token || req.headers['x-seed-token'] !== token) return res.status(401).send({ success: false, message: 'Unauthorized' })
        if (await propertySchema.countDocuments()) return res.status(409).send({ success: false, message: 'Database already has data' })
        await seedDatabase()
        return res.status(201).send({ success: true, message: 'Demo data loaded.' })
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
