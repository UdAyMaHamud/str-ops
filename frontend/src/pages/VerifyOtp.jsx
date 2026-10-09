import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { FiMail } from 'react-icons/fi'
import { useVerifyOtpMutation, useResendOtpMutation } from '../store/api/authApi'
import AuthLayout from '../layout/AuthLayout'
import OtpInput from '../components/common/OtpInput'

const RESEND_WAIT = 60

const VerifyOtp = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || '')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState('')
  const [cooldown, setCooldown] = useState(location.state?.email ? RESEND_WAIT : 0)
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation()
  const [resendOtp, { isLoading: resending }] = useResendOtpMutation()

  // ====== Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // ====== Submit
  const handleVerify = async (e) => {
    e.preventDefault()
    if (!email) return setErrors('Email is required.')
    if (otp.length !== 4) return setErrors('Enter the 4-digit code.')

    try {
      const res = await verifyOtp({ email, otp }).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setTimeout(() => navigate('/signin', { state: { email } }), 1200)
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Invalid or expired code.')
    }
  }

  const handleResend = async () => {
    if (!email) return setErrors('Enter your email first.')
    try {
      const res = await resendOtp(email).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setOtp('')
      setCooldown(RESEND_WAIT)
    } catch (err) {
      setErrors(err?.data?.message || 'Could not resend the code.')
    }
  }

  return (
    <AuthLayout>
      <span className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><FiMail size={20} /></span>
      <h1 className="mt-4 text-[30px] font-bold leading-tight">Verify your email</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {location.state?.email ? <>We sent a 4-digit code to <span className="font-semibold text-ink">{location.state.email}</span>. It expires in 5 minutes.</> : 'Enter your email and the 4-digit code we sent you.'}
      </p>

      <form onSubmit={handleVerify} className="mt-7 flex flex-col gap-4">
        {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
        {!location.state?.email && (
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors('') }}
            placeholder="Email"
            className="w-full h-12 rounded-2xl border border-line bg-white px-4 text-[14px] outline-none focus:border-accent"
          />
        )}
        <OtpInput value={otp} onChange={(v) => { setOtp(v); setErrors('') }} />
        <button disabled={isLoading} className="h-12 bg-primary text-white rounded-full font-semibold active:scale-95 cursor-pointer disabled:opacity-60">
          {isLoading ? 'Verifying...' : 'Verify email'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-2">
        Didn't get it?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="font-semibold text-accent cursor-pointer disabled:text-muted disabled:cursor-not-allowed"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend code'}
        </button>
      </p>
      <p className="mt-2 text-center text-[13px] text-ink-2">
        Wrong email? <Link to="/register" className="font-semibold text-accent">Start again</Link>
      </p>
    </AuthLayout>
  )
}

export default VerifyOtp
