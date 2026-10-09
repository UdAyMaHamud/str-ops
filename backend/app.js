require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const path = require('path')
const dbConfig = require('./dbConfig')
const { ensureDb } = require('./dbConfig')
const route = require('./routes')
const { apiLimiter } = require('./middleware/rateLimiters')

// The Express app, shared by the local server (index.js) and Vercel (api/index.js)
const app = express()

// ====== Allowed origins - extra deployed origins come from CLIENT_ORIGINS (comma separated)
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.CLIENT_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]

// ====== Middleware
// Behind Vercel, nginx or a load balancer the client IP arrives in X-Forwarded-For, which the rate limiter needs
if (process.env.TRUST_PROXY || process.env.VERCEL) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)
// cross-origin resource policy lets the dashboard show images served from /uploads
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: allowedOrigins, credentials: true }))
// Body size caps - an uncapped parser lets a single request exhaust memory
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use(apiLimiter)

// ====== Database: connect at boot; every request after that makes sure the connection is live
dbConfig()

// ====== Routes
app.get('/', (req, res) => res.status(200).send({ success: true, message: 'STR Ops API is running 🚀' }))
app.use(ensureDb, route)

// ====== Global error handler - guarantees a response for anything the routes throw
app.use((err, req, res, next) => {
    console.log(err)
    if (res.headersSent) return next(err)
    if (err?.type === 'entity.too.large') return res.status(413).send({ success: false, message: 'Payload too large' })
    res.status(err.status || 500).send({ success: false, message: err.status ? err.message : 'Internal server error' })
})

module.exports = app
