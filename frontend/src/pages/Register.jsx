import React, { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { FiCheck, FiMapPin, FiHome } from 'react-icons/fi'
import { useSignUpMutation, useGoogleAuthMutation } from '../store/api/authApi'
import { selectIsAuthenticated, selectCurrentUser, homePathFor } from '../store/slices/authSlice'
import AuthLayout from '../layout/AuthLayout'
import GoogleButton from '../components/common/GoogleButton'
import useCompleteLogin from '../components/common/useCompleteLogin'

// ====== Two ways in: book stays (guest) or list a property (owner)
const ACCOUNT_TYPES = {
  guest: {
    label: 'Book stays',
    icon: FiMapPin,
    title: 'Create your account',
    intro: 'Save homes you love and request a stay in minutes.',
    perks: ['Request to book with live prices', 'All your trips in one place', 'Save stays for later'],
  },
  owner: {
    label: 'List my property',
    icon: FiHome,
    title: 'Create your owner account',
    intro: 'Free to join. Add your property in two minutes.',
    perks: ['Live bookings, occupancy and revenue', 'Monthly owner report', 'Maintenance and reviews in one place'],
  },
}

const Register = () => {
  const [searchParams] = useSearchParams()
  const [accountType, setAccountType] = useState(searchParams.get('as') === 'owner' ? 'owner' : 'guest')
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState('')
  const [signUp, { isLoading }] = useSignUpMutation()
  const [googleAuth] = useGoogleAuthMutation()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const completeLogin = useCompleteLogin()
  const navigate = useNavigate()
  const type = ACCOUNT_TYPES[accountType]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors('')
  }

  // ====== Submit
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!formData.fullName.trim()) return setErrors('Full name is required.')
    if (!formData.email) return setErrors('Email is required.')
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(formData.password)) return setErrors('Password needs at least 6 characters with a letter and a number.')
    if (formData.password !== formData.confirm) return setErrors('Passwords do not match.')

    try {
      const { confirm, ...payload } = formData
      const res = await signUp({ ...payload, as: accountType }).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      navigate('/verify-otp', { state: { email: res.data?.email || payload.email } })
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
    }
  }

  // ====== Google
  const handleGoogle = async (credential) => {
    try {
      const res = await googleAuth({ credential, as: accountType }).unwrap()
      completeLogin(res)
    } catch (err) {
      setErrors(err?.data?.message || 'Google sign-up failed')
    }
  }

  if (isAuthenticated) return <Navigate to={homePathFor(user?.role)} replace />

  const inputCls = 'w-full h-12 rounded-2xl border border-line bg-white px-4 text-[14px] outline-none focus:border-accent'

  return (
    <AuthLayout>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white border border-line p-1 mb-6" role="tablist" aria-label="Account type">
        {Object.entries(ACCOUNT_TYPES).map(([key, t]) => (
          <button
            type="button"
            key={key}
            role="tab"
            aria-selected={accountType === key}
            onClick={() => { setAccountType(key); setErrors('') }}
            className={`flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-semibold cursor-pointer ${accountType === key ? 'bg-primary text-white' : 'text-ink-2 hover:bg-mint'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <h1 className="text-[30px] font-bold leading-tight">{type.title}</h1>
      <p className="mt-1 text-[14px] text-ink-2">{type.intro}</p>
      <ul className="mt-4 space-y-1.5">
        {type.perks.map((p) => (
          <li key={p} className="flex items-center gap-2 text-[13px] text-ink-2">
            <span className="h-5 w-5 rounded-full bg-primary-soft text-primary flex items-center justify-center"><FiCheck size={12} /></span>
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <GoogleButton onCredential={handleGoogle} text="signup_with" />
      </div>

      <div className="my-5 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-line" /> or with email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        {errors && <p className="bg-amber-300 rounded-xl py-2 px-3 text-center text-red-600 text-[13px] font-medium">{errors}</p>}
        <input name="fullName" autoComplete="name" className={inputCls} placeholder="Full name" value={formData.fullName} onChange={handleChange} />
        <input name="email" type="email" autoComplete="email" className={inputCls} placeholder="Email" value={formData.email} onChange={handleChange} />
        <input name="password" type="password" autoComplete="new-password" className={inputCls} placeholder="Password (6+ characters, a letter and a number)" value={formData.password} onChange={handleChange} />
        <input name="confirm" type="password" autoComplete="new-password" className={inputCls} placeholder="Confirm password" value={formData.confirm} onChange={handleChange} />
        <button disabled={isLoading} className="h-12 bg-primary text-white rounded-full font-semibold active:scale-95 cursor-pointer disabled:opacity-60">
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-ink-2">
        Already have an account? <Link to="/signin" className="font-semibold text-accent">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

export default Register
