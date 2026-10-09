const app = require('./app')

const port = process.env.PORT || 8000

// ====== Server (local and traditional hosting; Vercel uses api/index.js instead)
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})
