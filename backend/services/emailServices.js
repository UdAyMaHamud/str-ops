const nodemailer = require('nodemailer')

const hasSmtp = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS)

// Gmail SMTP: SMTP_PASS is a Google "app password", not the account password
const transporter = hasSmtp()
    ? nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null

// Callers fire this without awaiting, so an SMTP failure must never escape this function
const sendEmail = async ({ email, subject, template, item }) => {
    try {
        if (!transporter) {
            // Staging fallback: no SMTP configured, print the code so sign-up can still be tested
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[email] SMTP not set. To: ${email} | ${subject} | code: ${item}`)
            }
            return null
        }
        return await transporter.sendMail({
            from: `"STR Ops" <${process.env.SMTP_USER}>`,
            to: email,
            subject,
            html: template(item),
        })
    } catch (error) {
        console.log(error)
    }
}

module.exports = sendEmail
