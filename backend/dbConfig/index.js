const mongoose = require('mongoose')
const { seedIfEmpty } = require('../services/seed')
const { startLocalDb, stopLocalDb } = require('./localDb')
const { startHostawaySync } = require('../services/hostawayService')

const dbConfig = async () => {
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

    await mongoose
        .connect(dbString)
        .then(() => console.log('DB Connected!'))
        .catch((err) => console.log('DB connection error:', err.message))

    // Mock data only goes into an empty database, never when SEED_MOCK=false (live data).
    // On Vercel many instances can start at once, so seeding is done by hand there (npm run seed).
    if (process.env.SEED_MOCK !== 'false' && !process.env.VERCEL) await seedIfEmpty()

    // Real listings and reservations from Hostaway (only when credentials are set).
    // Serverless has no long-running timers: Vercel Cron calls /system/hostaway/cron instead.
    if (!process.env.VERCEL) startHostawaySync()
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
