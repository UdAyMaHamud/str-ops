import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { useSignInMutation, useGoogleAuthMutation } from '../store/api/authApi'
import { selectIsAuthenticated, selectCurrentUser, landingPathFor } from '../store/slices/authSlice'
import AuthLayout from '../layout/AuthLayout'
import GoogleButton from '../components/common/GoogleButton'
import useCompleteLogin from '../components/common/useCompleteLogin'

const DEMO_USERS = [
  { role: 'Guest', email: 'guest@strops.test', password: 'Guest@123' },
  { role: 'Owner', email: 'client@strops.test', password: 'Client@123' },
  { role: 'Trainee', email: 'trainee@strops.test', password: 'Trainee@123' },
  { role: 'Senior', email: 'senior@strops.test', password: 'Senior@123' },
  { role: 'Admin', email: 'admin@strops.test', password: 'Admin@123' },
]

const SignIn = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: location.state?.email || '', password: '' })
  const [errors, setErrors] = useState('')
  const [signIn, { isLoading }] = useSignInMutation()
  const [googleAuth] = useGoogleAuthMutation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const completeLogin = useCompleteLogin()
  // Back to where they were (e.g. a stay they wanted to book), else their own home
  const from = location.state?.from
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : undefined

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors('')
  }

  // ====== Submit
  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!formData.email) return setErrors('Email is required.')
    if (!formData.password) return setErrors('Password is required.')

    try {
      const res = await signIn(formData).unwrap()
      completeLogin(res, redirectTo)
    } catch (err) {
      // Unverified email: the server sent a fresh code, go and enter it
      if (err?.data?.needsVerification) {
        toast(err.data.message, { duration: 4000, position: 'top-center' })
        return navigate('/verify-otp', { state: { email: err.data.data?.email || formData.email } })
      }
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  // ====== Google
  const handleGoogle = async (credential) => {
    try {
      const res = await googleAuth(credential).unwrap()
      completeLogin(res, redirectTo)
    } catch (err) {
      setErrors(err?.data?.message || 'Google sign-in failed')
    }
  }

  if (isAuthenticated) return <Navigate to={landingPathFor(user?.role, redirectTo)} replace />

  const inputCls = 'w-full h-12 rounded-2xl border border-line bg-white px-4 text-[14px] outline-none focus:border-accent'

  return (
    <AuthLayout>
      <h1 className="text-[30px] font-bold leading-tight">Welcome back</h1>
      <p className="mt-1 text-[14px] text-ink-2">Sign in to manage your trips or your properties.</p>

      <div className="mt-7">
        <GoogleButton onCredential={handleGoogle} text="signin_with" />
      </div>

      <div className="my-5 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSignIn} className="flex flex-col gap-3">
        {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
        <input name="email" type="email" autoComplete="email" className={inputCls} placeholder="Email" value={formData.email} onChange={handleChange} />
        <input name="password" type="password" autoComplete="current-password" className={inputCls} placeholder="Password" value={formData.password} onChange={handleChange} />
        <Link to="/forgot-password" state={{ email: formData.email }} className="-mt-1 self-end text-[12px] font-medium text-accent">Forgot password?</Link>
        <button disabled={isLoading} className="h-12 bg-primary text-white rounded-full font-semibold active:scale-95 cursor-pointer disabled:opacity-60">
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-2">
        New here? <Link to="/register" className="font-semibold text-accent">Create an account</Link>
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-line p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">Staging demo accounts</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {DEMO_USERS.map((u) => (
            <button
              type="button"
              key={u.email}
              onClick={() => { setFormData({ email: u.email, password: u.password }); setErrors('') }}
              className="rounded-xl bg-white border border-line px-2 py-2 text-[12px] font-medium hover:border-accent cursor-pointer active:scale-95"
            >
              {u.role}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}

export default SignIn
