import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import toast from 'react-hot-toast'
import { FiKey } from 'react-icons/fi'
import { useForgotPasswordMutation } from '../store/api/authApi'
import AuthLayout from '../layout/AuthLayout'

const ForgotPassword = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || '')
  const [errors, setErrors] = useState('')
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation()

  // ====== Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return setErrors('Email is required.')

    try {
      const res = await forgotPassword(email).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      navigate('/reset-password', { state: { email } })
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  return (
    <AuthLayout>
      <span className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><FiKey size={20} /></span>
      <h1 className="mt-4 text-[30px] font-bold leading-tight">Forgot your password?</h1>
      <p className="mt-1 text-[14px] text-ink-2">Enter your email and we'll send you a 4-digit reset code.</p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
        {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors('') }}
          placeholder="Email"
          className="w-full h-12 rounded-2xl border border-line bg-white px-4 text-[14px] outline-none focus:border-accent"
        />
        <button disabled={isLoading} className="h-12 bg-primary text-white rounded-full font-semibold active:scale-95 cursor-pointer disabled:opacity-60">
          {isLoading ? 'Sending...' : 'Send reset code'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-2">
        Remembered it? <Link to="/signin" className="font-semibold text-accent">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default ForgotPassword
