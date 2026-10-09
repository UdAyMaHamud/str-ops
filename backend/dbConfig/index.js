const mongoose = require('mongoose')
const { seedIfEmpty } = require('../services/seed')
const { startLocalDb, stopLocalDb } = require('./localDb')
const { startHostawaySync } = require('../services/hostawayService')

// Fail fast instead of letting queries wait on a database that is unreachable
mongoose.set('bufferTimeoutMS', 8000)

let connecting = null
let startedJobs = false

// ====== Connect once; if it fails, the next request tries again (important on serverless)
const connectDb = async () => {
    if (mongoose.connection.readyState === 1) return
    if (connecting) return connecting

    connecting = (async () => {
        let dbString = process.env.DB_STRING
        if (!dbString) {
            // Production must never fall back to a local database
            if (process.env.NODE_ENV === 'production') {
                console.log('DB_STRING is required in production. Stopping.')
                process.exit(1)
            }
            dbString = await startLocalDb()
            console.log('DB_STRING not set. Using the local database in backend/.data (kept between restarts).')
        }

        await mongoose.connect(dbString, { serverSelectionTimeoutMS: 8000 })
        console.log('DB Connected!')

        if (!startedJobs) {
            startedJobs = true
            // Mock data only goes into an empty database, never when SEED_MOCK=false (live data).
            // On Vercel many instances can start at once, so seeding is done by hand there.
            if (process.env.SEED_MOCK !== 'false' && !process.env.VERCEL) await seedIfEmpty()
            // Serverless has no long-running timers: Vercel Cron calls /system/hostaway/cron instead.
            if (!process.env.VERCEL) startHostawaySync()
        }
    })()

    try {
        await connecting
    } catch (err) {
        console.log('DB connection error:', err.message)
        throw err
    } finally {
        connecting = null
    }
}

// ====== Start connecting at boot (a failure is retried by ensureDb on the next request)
const dbConfig = () => connectDb().catch(() => {})

// ====== Middleware: every request waits for a live connection, or gets a clear 503
const ensureDb = async (req, res, next) => {
    try {
        await connectDb()
        next()
    } catch {
        return res.status(503).send({ success: false, message: 'Database is unavailable. Please try again in a moment.' })
    }
}

// ====== Clean shutdown keeps the local data files consistent
const shutdown = async () => {
    await mongoose.disconnect().catch(() => {})
    await stopLocalDb().catch(() => {})
    process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

module.exports = dbConfig
module.exports.ensureDb = ensureDb
