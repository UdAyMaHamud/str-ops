import React from 'react'
import { Link } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import Logo from '../components/common/Logo'
import heroVilla from '../assets/hero-villa.jpg'

// Split screen: form on the left, property photo on the right
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr] bg-page">
      <div className="flex flex-col px-6 sm:px-12 py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="font-bold text-[17px]">STR Ops</span>
          </Link>
          <Link to="/" className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-primary">
            <FiArrowLeft size={14} /> Back to site
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>

      <div className="hidden lg:block p-4">
        <div className="relative h-full rounded-[28px] overflow-hidden">
          <img src={heroVilla} alt="Modern vacation home with a pool" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
            <p className="text-[12px] uppercase tracking-[0.18em] text-white/70">For property owners</p>
            <p className="mt-3 text-[30px] font-bold leading-tight max-w-md">
              Your rental, run end to end. You watch the numbers.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
              {[
                ['24/7', 'Guest messaging'],
                ['60 days', 'Pricing ahead'],
                ['1 page', 'Monthly report'],
              ].map(([value, name]) => (
                <div key={name} className="rounded-2xl bg-white/12 backdrop-blur px-3 py-2.5 border border-white/15">
                  <p className="text-[18px] font-bold">{value}</p>
                  <p className="text-[11px] text-white/75">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
