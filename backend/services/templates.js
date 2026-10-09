// HTML email templates. Email clients ignore <style> and class names, so everything is inline.

const codeEmail = ({ title, intro, code, footer }) => `
<div style="background:#eef3ef;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e3e9e4;">
    <div style="height:6px;background:#1f4a35;"></div>
    <div style="padding:36px 32px;text-align:center;">
      <p style="margin:0;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#2f7a50;font-weight:bold;">STR Ops</p>
      <h1 style="margin:16px 0 8px;font-size:24px;color:#141c17;">${title}</h1>
      <p style="margin:0;font-size:14px;line-height:22px;color:#59625c;">${intro}</p>
      <div style="margin:28px auto;display:inline-block;padding:16px 28px;border-radius:14px;background:#dcebe0;font-size:32px;letter-spacing:10px;font-weight:bold;color:#1f4a35;">${code}</div>
      <p style="margin:0;font-size:12px;line-height:20px;color:#8b948d;">${footer}</p>
    </div>
  </div>
</div>`

const emailVerificationTemp = (code) =>
    codeEmail({
        title: 'Verify your email',
        intro: 'Use this code to finish creating your owner account.',
        code,
        footer: 'The code expires in 5 minutes. If you did not sign up, you can ignore this email.',
    })

const resetPasswordTemp = (code) =>
    codeEmail({
        title: 'Reset your password',
        intro: 'Use this code to choose a new password.',
        code,
        footer: 'The code expires in 5 minutes. If you did not ask for a reset, you can ignore this email.',
    })

module.exports = { emailVerificationTemp, resetPasswordTemp }
