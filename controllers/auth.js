const User = require('../models/User')
const crypto = require('crypto')
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');

const register = async (req, res, next) => {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return next(new ErrorResponse("Please provide username. email and password", 400))
    }

    try {
        const user = await User.create({
            username,
            email,
            password
        })
        sendToken(user, 201, res)
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

const login = async (req, res, next) => {

    const { email, password } = req.body

    if (!email || !password) {
        return next(new ErrorResponse("Please provide email and password", 400))
    }

    try {
        const user = await User.findOne({ email }).select("+password")
        if (!user) {
            return next(new ErrorResponse("Invalid Credentials", 401))
        }


        // Check that password match
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return next(new ErrorResponse("Invalid Credentials", 401))
        }

        sendToken(user, 200, res)

    } catch (error) {
        return res.status(404).json({
            success: false,
            error: error.message
        })
    }


}

const forgotPassword = async (req, res, next) => {
    const { email } = req.body

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return next(new ErrorResponse("Email could not be sent", 404))
        }

        const restToken = user.getResetPasswordToken()

        await user.save()

        const resetUrl = `http://localhost:3000/passwordreset/${restToken}`

        const message = `
        <h1>You have requested a password reset</h1>
        <p>Please go to this link to reset your password</p>
        <a href=${resetUrl} clicktraking=off>${resetUrl}</a>
        `

        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset request",
                text: message
            })

            res.status(200).json({
                success: true,
                data: "Email was sent"
            })
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;


            await user.save()

            return next(new ErrorResponse("Email could not be sent,500"))
        }

    } catch (error) {
        next(error)
    }
}

const resetPassword = async (req, res, next) => {

    const { resetToken } = req.params;
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        })

        if (!user) {
            return next(new ErrorResponse("invalid reset token", 400))
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save()

        return res.status(201).json({
            success: true,
            data: "Password reset Success"
        })
    } catch (error) {
        next(error)
    }
    // console.log(resetToken)

}

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
}

const sendToken = (user, statusCode, res) => {
    const token = user.getSignedToken()
    res.status(statusCode).json({ success: true, token })
}