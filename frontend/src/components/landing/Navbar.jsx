import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { FiMenu, FiX, FiLogOut } from 'react-icons/fi'
import { selectCurrentUser, selectIsAuthenticated, logout } from '../../store/slices/authSlice'
import { useLogoutMutation } from '../../store/api/authApi'
import { apiSlice } from '../../store/apiSlice'
import Logo from '../common/Logo'
import { initials } from '../common/format'

const LINKS = [
  { Name: 'Home', to: '/' },
  { Name: 'Stays', to: '/stays' },
  { Name: 'Owners', to: '/#owners' },
  { Name: 'Services', to: '/#services' },
]

const Navbar = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector(selectCurrentUser)
  const isGuest = user?.role === 'guest'
  const [open, setOpen] = useState(false)
  const [logoutRequest] = useLogoutMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // ====== Sign out (guests stay on the public site)
  const handleSignOut = async () => {
    try {
      await logoutRequest().unwrap()
    } catch (err) {
      console.log(err)
    }
    dispatch(logout())
    dispatch(apiSlice.util.resetApiState())
    setOpen(false)
    navigate('/')
  }

  const linkCls = ({ isActive }) =>
    `block px-4 py-1.5 rounded-full text-[13px] ${isActive ? 'bg-white text-navy font-semibold shadow-sm' : 'text-navy/70 hover:text-navy'}`

  return (
    <header className="relative z-20">
      <nav className="container mx-auto max-w-[1200px] px-5 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-9 w-9" />
          <span className="font-bold text-[17px] text-navy">STR Ops</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1 rounded-full bg-white/55 backdrop-blur border border-white/70 p-1">
          {LINKS.map(({ Name, to }) => (
            <li key={Name}>
              {to.includes('#') ? (
                <Link to={to} className="block px-4 py-1.5 rounded-full text-[13px] text-navy/70 hover:text-navy">{Name}</Link>
              ) : (
                <NavLink to={to} end className={linkCls}>{Name}</NavLink>
              )}
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          {!isAuthenticated && (
            <>
              <Link to="/signin" className="px-4 py-2 rounded-lg border border-navy/15 bg-white/60 text-navy text-[13px] font-medium hover:bg-white">Log in</Link>
              <Link to="/register" className="px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-semibold active:scale-95">Sign up</Link>
            </>
          )}
          {isAuthenticated && isGuest && (
            <>
              <NavLink to="/trips" className={({ isActive }) => `px-3 py-2 rounded-lg text-[13px] font-medium ${isActive ? 'bg-white text-navy' : 'text-navy/75 hover:text-navy'}`}>My trips</NavLink>
              <NavLink to="/saved" className={({ isActive }) => `px-3 py-2 rounded-lg text-[13px] font-medium ${isActive ? 'bg-white text-navy' : 'text-navy/75 hover:text-navy'}`}>Saved</NavLink>
              <span className="h-9 w-9 rounded-full bg-navy text-white text-[12px] font-bold flex items-center justify-center" title={user?.fullName}>{initials(user?.fullName)}</span>
              <button onClick={handleSignOut} className="h-9 w-9 rounded-full border border-navy/15 bg-white/60 text-navy flex items-center justify-center cursor-pointer" aria-label="Sign out" title="Sign out">
                <FiLogOut size={14} />
              </button>
            </>
          )}
          {isAuthenticated && !isGuest && (
            <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-semibold active:scale-95">Open dashboard</Link>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-navy cursor-pointer" aria-label="Menu">
          {open ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden mx-5 rounded-2xl bg-white shadow-xl p-3 flex flex-col gap-1">
          {LINKS.map(({ Name, to }) => (
            <Link key={Name} to={to} onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl text-[14px] text-navy hover:bg-sky-3">{Name}</Link>
          ))}
          {isGuest && (
            <>
              <Link to="/trips" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl text-[14px] text-navy hover:bg-sky-3">My trips</Link>
              <Link to="/saved" onClick={() => setOpen(false)} className="px-3 py-2 rounded-xl text-[14px] text-navy hover:bg-sky-3">Saved</Link>
            </>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {!isAuthenticated && (
              <>
                <Link to="/signin" className="text-center px-4 py-2 rounded-lg border border-line text-navy text-[13px]">Log in</Link>
                <Link to="/register" className="text-center px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-semibold">Sign up</Link>
              </>
            )}
            {isAuthenticated && isGuest && (
              <button onClick={handleSignOut} className="col-span-2 px-4 py-2 rounded-lg border border-line text-navy text-[13px] cursor-pointer">Sign out</button>
            )}
            {isAuthenticated && !isGuest && (
              <Link to="/dashboard" className="col-span-2 text-center px-4 py-2 rounded-lg bg-navy text-white text-[13px] font-semibold">Open dashboard</Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
