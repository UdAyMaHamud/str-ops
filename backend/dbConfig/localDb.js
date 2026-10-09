const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

// ====== Local development database, stored on disk in backend/.data so data survives restarts
// Used only when DB_STRING is empty and NODE_ENV is not production.
const LOCAL_PORT = Number(process.env.LOCAL_DB_PORT) || 27027
const LOCAL_URI = `mongodb://127.0.0.1:${LOCAL_PORT}/str-ops`

let localServer = null

const startLocalDb = async () => {
    // Another process (the API or a seed run) may already have it open
    try {
        const probe = await mongoose.createConnection(LOCAL_URI, { serverSelectionTimeoutMS: 1500 }).asPromise()
        await probe.close()
        return LOCAL_URI
    } catch {
        // not running yet, start it below
    }

    const { MongoMemoryServer } = require('mongodb-memory-server')
    const dbPath = path.join(__dirname, '../.data/db')
    fs.mkdirSync(dbPath, { recursive: true })
    localServer = await MongoMemoryServer.create({
        instance: { dbPath, storageEngine: 'wiredTiger', port: LOCAL_PORT },
    })
    return LOCAL_URI
}

// Stop without deleting the data folder
const stopLocalDb = async () => {
    if (localServer) await localServer.stop({ doCleanup: false })
}

module.exports = { startLocalDb, stopLocalDb, LOCAL_URI }
