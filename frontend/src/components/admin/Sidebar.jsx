import React from 'react'
import { Link, NavLink } from 'react-router'
import { useSelector } from 'react-redux'
import { FiX, FiLogOut } from 'react-icons/fi'
import { selectCurrentUser } from '../../store/slices/authSlice'
import { navFor } from './navItems'
import Logo from '../common/Logo'

// Narrow icon rail on desktop (labels on hover), full drawer on mobile
const Sidebar = ({ open, onClose, onSignOut }) => {
  const user = useSelector(selectCurrentUser)
  const items = navFor(user?.role)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`no-print fixed lg:sticky top-0 z-40 h-screen w-64 lg:w-[76px] shrink-0 bg-admin-sidebar border-r border-line flex flex-col transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between lg:justify-center h-[76px] px-5 lg:px-0">
          <Link to="/" aria-label="Home" className="flex items-center gap-2">
            <Logo className="h-9 w-9" />
            <span className="lg:hidden font-bold text-[16px]">STR Ops</span>
          </Link>
          <button onClick={onClose} className="lg:hidden cursor-pointer text-ink-2" aria-label="Close menu">
            <FiX size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto lg:overflow-visible px-3 lg:px-0 py-2">
          <ul className="flex flex-col gap-1 lg:items-center">
            {items.map(({ Name, path, icon: Icon }) => (
              <li key={path} className="relative group">
                <NavLink
                  to={path}
                  end={path === '/dashboard'}
                  onClick={onClose}
                  aria-label={Name}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 lg:px-0 lg:justify-center h-11 lg:w-11 text-[14px] transition-colors ${
                      isActive ? 'bg-primary text-white' : 'text-ink-2 hover:bg-mint hover:text-primary'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="lg:hidden">{Name}</span>
                </NavLink>
                {/* Hover label on the desktop rail */}
                <span className="hidden lg:group-hover:block absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-primary text-white text-[12px] px-2.5 py-1 shadow-lg pointer-events-none">
                  {Name}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-3 lg:px-0 py-4 flex flex-col lg:items-center gap-1 border-t border-line">
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex items-center gap-3 rounded-xl px-3 lg:px-0 lg:justify-center h-11 lg:w-11 text-[14px] text-ink-2 hover:bg-mint hover:text-critical cursor-pointer"
          >
            <FiLogOut size={18} />
            <span className="lg:hidden">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
