import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { FiMenu, FiSearch, FiBell, FiLogOut, FiChevronDown, FiHome } from 'react-icons/fi'
import { useGetOverviewQuery, useGetPropertiesQuery } from '../../store/api/overviewApi'
import { selectDays, selectProperty, setProperty } from '../../store/slices/filterSlice'
import { selectCurrentUser } from '../../store/slices/authSlice'
import { navFor } from './navItems'
import StatusBadge from '../common/StatusBadge'
import { initials, imgUrl } from '../common/format'

// US guests and the BD team work across time zones (workbook Section 01)
const CLOCKS = [
  { name: 'US ET', timeZone: 'America/New_York' },
  { name: 'Dhaka', timeZone: 'Asia/Dhaka' },
]

// Each role's greeting line
const SUBTITLES = {
  client: 'Explore information and activity about your property.',
  trainee: "Your Day Card, your shift queue and your drafts. Draft, don't send.",
  senior: 'Review what the team drafted and keep every guest on time.',
  admin: 'Accounts, owners, listings and system health across the platform.',
}

const ROLE_TEXT = {
  client: 'Property owner',
  trainee: 'Trainee · read-only + drafts',
  senior: 'Senior · can approve',
  admin: 'Admin',
}

const Topbar = ({ onMenu, onSignOut }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const property = useSelector(selectProperty)
  const days = useSelector(selectDays)
  const user = useSelector(selectCurrentUser)
  const { data } = useGetPropertiesQuery()
  const { data: overviewData } = useGetOverviewQuery({ property, days })
  const [now, setNow] = useState(new Date())
  const [query, setQuery] = useState('')
  const [openMenu, setOpenMenu] = useState('')
  const wrapRef = useRef(null)
  const properties = data?.data || []
  const signals = overviewData?.data?.signals || []
  const isStaff = user?.role !== 'client'

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // ====== Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenMenu('')
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ====== Search pages and properties
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const pages = navFor(user?.role)
      .filter((p) => p.Name.toLowerCase().includes(q))
      .map((p) => ({ key: p.path, label: p.Name, hint: 'Page', icon: p.icon, onSelect: () => navigate(p.path) }))
    const props = properties
      .filter((p) => `${p.code} ${p.name} ${p.city}`.toLowerCase().includes(q))
      .map((p) => ({
        key: p._id,
        label: `${p.code} · ${p.name}`,
        hint: `${p.city}, ${p.state}`,
        icon: FiHome,
        onSelect: () => dispatch(setProperty(p._id)),
      }))
    return [...props, ...pages].slice(0, 7)
  }, [query, properties, user, navigate, dispatch])

  const handleSelect = (item) => {
    item.onSelect()
    setQuery('')
    setOpenMenu('')
  }

  const firstName = user?.fullName?.split(' ')[0] || 'there'

  return (
    <header className="no-print sticky top-0 z-20 bg-page/85 backdrop-blur">
      <div ref={wrapRef} className="flex flex-wrap items-center gap-3 px-4 lg:px-8 py-4">
        <button onClick={onMenu} className="lg:hidden cursor-pointer text-ink-2" aria-label="Open menu">
          <FiMenu size={22} />
        </button>

        <div className="min-w-0 mr-auto">
          <h1 className="text-[20px] sm:text-[22px] font-bold leading-tight">Hello, {firstName}!</h1>
          <p className="text-[12px] sm:text-[13px] text-ink-2 truncate">
            {SUBTITLES[user?.role] || SUBTITLES.client}
            {isStaff && (
              <span className="hidden xl:inline text-muted">
                {' '}· {CLOCKS.map((c) => `${c.name} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: c.timeZone })}`).join(' · ')}
              </span>
            )}
          </p>
        </div>

        {/* ====== Property filter ====== */}
        <div className="relative">
          <select
            value={property}
            onChange={(e) => dispatch(setProperty(e.target.value))}
            className="appearance-none h-11 max-w-[210px] rounded-full bg-white border border-line pl-4 pr-9 text-[13px] outline-none focus:border-accent cursor-pointer"
            aria-label="Property filter"
          >
            <option value="all">All properties ({properties.length})</option>
            {properties.map((p) => (
              <option key={p._id} value={p._id}>{p.code} · {p.name}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
        </div>

        {/* ====== Search ====== */}
        <div className="relative hidden md:block">
          <div className="flex items-center h-11 w-[260px] rounded-full bg-white border border-line pl-4 pr-1">
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpenMenu('search') }}
              onKeyDown={(e) => e.key === 'Enter' && results[0] && handleSelect(results[0])}
              placeholder="Search anything..."
              className="flex-1 min-w-0 bg-transparent text-[13px] outline-none"
              aria-label="Search pages and properties"
            />
            <span className="h-9 w-9 rounded-full bg-ink text-white flex items-center justify-center">
              <FiSearch size={15} />
            </span>
          </div>
          {openMenu === 'search' && query && (
            <ul className="absolute right-0 mt-2 w-[300px] rounded-2xl bg-white border border-line shadow-xl p-1.5">
              {results.length === 0 && <li className="px-3 py-2 text-[12px] text-muted">No matches</li>}
              {results.map((r) => (
                <li key={r.key}>
                  <button onClick={() => handleSelect(r)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-mint cursor-pointer">
                    <r.icon className="text-accent shrink-0" size={15} />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{r.label}</span>
                    <span className="text-[11px] text-muted">{r.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ====== Notifications (needs-attention signals) ====== */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'bell' ? '' : 'bell')}
            className="relative h-11 w-11 rounded-full bg-white border border-line flex items-center justify-center text-ink-2 hover:text-primary cursor-pointer"
            aria-label={`Notifications (${signals.length})`}
          >
            <FiBell size={17} />
            {signals.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-critical text-white text-[10px] font-bold flex items-center justify-center">
                {signals.length}
              </span>
            )}
          </button>
          {openMenu === 'bell' && (
            <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] rounded-2xl bg-white border border-line shadow-xl p-2">
              <p className="px-2 py-1.5 text-[12px] font-semibold text-muted uppercase tracking-wider">Needs attention</p>
              {signals.length === 0 && <p className="px-2 py-3 text-[13px]">All normal.</p>}
              <ul className="max-h-[360px] overflow-y-auto">
                {signals.map((s, i) => (
                  <li key={i}>
                    <Link to={`/dashboard${s.link}`} onClick={() => setOpenMenu('')} className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-mint">
                      <StatusBadge level={s.level}>{s.level === 'critical' ? 'Critical' : 'Watch'}</StatusBadge>
                      <span className="text-[13px] leading-snug">{s.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ====== Profile ====== */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'profile' ? '' : 'profile')}
            className="flex items-center gap-2 h-11 rounded-full bg-white border border-line pl-1 pr-3 cursor-pointer"
            aria-label="Account menu"
          >
            {user?.avatar ? (
              <img src={imgUrl(user.avatar)} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="h-9 w-9 rounded-full bg-primary-soft text-primary text-[12px] font-bold flex items-center justify-center">{initials(user?.fullName)}</span>
            )}
            <FiChevronDown size={14} className="text-muted" />
          </button>
          {openMenu === 'profile' && (
            <div className="absolute right-0 mt-2 w-[240px] rounded-2xl bg-white border border-line shadow-xl p-2">
              <div className="px-2 py-2 border-b border-line mb-1">
                <p className="text-[14px] font-semibold truncate">{user?.fullName}</p>
                <p className="text-[12px] text-muted truncate">{user?.email}</p>
                <p className="mt-1 text-[11px] text-accent font-medium">{ROLE_TEXT[user?.role]}</p>
              </div>
              <button onClick={onSignOut} className="w-full flex items-center gap-2 rounded-xl px-2 py-2 text-[13px] text-critical hover:bg-mint cursor-pointer">
                <FiLogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
