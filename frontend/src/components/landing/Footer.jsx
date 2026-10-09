import React from 'react'
import { Link } from 'react-router'
import Logo from '../common/Logo'

const Footer = () => {
  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto max-w-[1200px] px-5 py-12 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9" dark />
            <span className="font-bold text-[17px]">STR Ops</span>
          </div>
          <p className="mt-3 max-w-xs text-[13px] text-white/60">
            Short-term rental stays and full-service property management for US hosts.
          </p>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">Guests</p>
          <ul className="space-y-2 text-[13px] text-white/75">
            <li><Link to="/stays" className="hover:text-white">All stays</Link></li>
            <li><Link to="/trips" className="hover:text-white">My trips</Link></li>
            <li><Link to="/#services" className="hover:text-white">How we host</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">Owners</p>
          <ul className="space-y-2 text-[13px] text-white/75">
            <li><Link to="/register?as=owner" className="hover:text-white">List your property</Link></li>
            <li><Link to="/signin" className="hover:text-white">Owner login</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-white/40 mb-3">Team</p>
          <ul className="space-y-2 text-[13px] text-white/75">
            <li><Link to="/signin" className="hover:text-white">Staff sign in</Link></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-[12px] text-white/45">
        © {new Date().getFullYear()} STR Ops. Photos: Unsplash.
      </p>
    </footer>
  )
}

export default Footer
