import React from 'react'

// Simple roof + window mark, works on light and dark backgrounds
const Logo = ({ className = 'h-8 w-8', dark = false }) => {
  return (
    <span className={`inline-flex items-center justify-center rounded-xl ${dark ? 'bg-white/10' : 'bg-primary'} ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9.5h13V10" />
        <path d="M10 19.5v-5h4v5" />
      </svg>
    </span>
  )
}

export default Logo
