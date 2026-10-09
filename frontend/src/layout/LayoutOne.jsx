import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import Navbar from '../components/landing/Navbar'
import Footer from '../components/landing/Footer'

// Public site layout: landing, stays, stay details, guest trips
const LayoutOne = () => {
  const { pathname, hash } = useLocation()

  // ====== "/#owners" style links scroll to the section; new pages start at the top
  useEffect(() => {
    if (hash) {
      const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 80)
      return () => clearTimeout(timer)
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div id="top" className="relative min-h-screen flex flex-col bg-white">
      <div className="absolute inset-x-0 top-0 h-[980px] -z-0 bg-[radial-gradient(ellipse_at_20%_10%,var(--color-sky-1),transparent_55%),radial-gradient(ellipse_at_85%_15%,var(--color-sky-2),transparent_50%),radial-gradient(ellipse_at_50%_70%,var(--color-sky-3),transparent_60%)]" />
      <Navbar />
      <main className="relative flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default LayoutOne
