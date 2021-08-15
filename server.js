require('dotenv').config()
const authRouter = require('./routes/auths')
const privateRouter = require('./routes/private')
const connectDb = require('./config/db')
const errorHandler = require('./middleware/error')
const cors = require('cors')


const express = require('express')

// Connect DB
connectDb()

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({})),
    app.use('/api/auth', authRouter)
app.use('/api/private', privateRouter)

// error handler should be last piece of middleware
app.use(errorHandler)

const server = app.listen(PORT, () => console.log(`Listening at port:${PORT}`))

process.on("unhandledRejection", (err, promise) => {
    console.log(`Logged Error:${err}`);
    server.close(() => process.exit(1))
})