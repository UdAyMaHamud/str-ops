import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { FiLock } from 'react-icons/fi'
import { useResetPasswordMutation } from '../store/api/authApi'
import AuthLayout from '../layout/AuthLayout'
import OtpInput from '../components/common/OtpInput'

const isValidPassword = (password) => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)

const ResetPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: location.state?.email || '', otp: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState('')
  const [resetPassword, { isLoading }] = useResetPasswordMutation()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors('')
  }

  // ====== Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email) return setErrors('Email is required.')
    if (formData.otp.length !== 4) return setErrors('Enter the 4-digit code.')
    if (!isValidPassword(formData.newPassword)) return setErrors('Password needs at least 6 characters with a letter and a number.')
    if (formData.newPassword !== formData.confirm) return setErrors('Passwords do not match.')

    try {
      const { confirm, ...payload } = formData
      const res = await resetPassword(payload).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setTimeout(() => navigate('/signin', { state: { email: formData.email } }), 1200)
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  const inputCls = 'w-full h-12 rounded-2xl border border-line bg-white px-4 text-[14px] outline-none focus:border-accent'

  return (
    <AuthLayout>
      <span className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><FiLock size={20} /></span>
      <h1 className="mt-4 text-[30px] font-bold leading-tight">Choose a new password</h1>
      <p className="mt-1 text-[14px] text-ink-2">
        {location.state?.email ? <>Enter the code sent to <span className="font-semibold text-ink">{location.state.email}</span>.</> : 'Enter your email, the code we sent and a new password.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
        {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
        {!location.state?.email && <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputCls} />}
        <OtpInput value={formData.otp} onChange={(v) => { setFormData((p) => ({ ...p, otp: v })); setErrors('') }} />
        <input name="newPassword" type="password" autoComplete="new-password" value={formData.newPassword} onChange={handleChange} placeholder="New password" className={`${inputCls} mt-1`} />
        <input name="confirm" type="password" autoComplete="new-password" value={formData.confirm} onChange={handleChange} placeholder="Confirm new password" className={inputCls} />
        <p className="text-[12px] text-muted -mt-1">At least 6 characters with a letter and a number.</p>
        <button disabled={isLoading} className="h-12 bg-primary text-white rounded-full font-semibold active:scale-95 cursor-pointer disabled:opacity-60">
          {isLoading ? 'Saving...' : 'Reset password'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-2">
        No code? <Link to="/forgot-password" state={{ email: formData.email }} className="font-semibold text-accent">Send a new one</Link>
      </p>
    </AuthLayout>
  )
}

export default ResetPassword
