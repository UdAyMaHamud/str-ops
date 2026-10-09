import React from 'react'
import { Link } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { FiUsers, FiHome, FiClipboard, FiServer } from 'react-icons/fi'
import { useGetAdminHomeQuery } from '../../store/api/homeApi'
import { useGetOverviewQuery } from '../../store/api/overviewApi'
import { selectDays, selectProperty, setDays } from '../../store/slices/filterSlice'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import StateBlock from '../common/StateBlock'
import HomeHero, { HeroStat } from './HomeHero'
import RevenueReport from './RevenueReport'
import GoLiveChecklist from './GoLiveChecklist'
import { money, pct, signedPct, change, timeAgo, initials } from '../common/format'

const ROLE_NAMES = { guest: 'Guests', client: 'Owners', trainee: 'Trainees', senior: 'Seniors', admin: 'Admins' }
const ROLE_SINGLE = { guest: 'Guest', client: 'Owner', trainee: 'Trainee', senior: 'Senior', admin: 'Admin' }

const AdminHome = () => {
  const dispatch = useDispatch()
  const property = useSelector(selectProperty)
  const days = useSelector(selectDays)
  const { data, isLoading, error } = useGetAdminHomeQuery(undefined, { pollingInterval: 120000 })
  const { data: overviewData } = useGetOverviewQuery({ property, days })
  const home = data?.data
  const overview = overviewData?.data
  const maxRole = home ? Math.max(...Object.values(home.roles), 1) : 1

  return (
    <StateBlock isLoading={isLoading} error={error}>
      {home && (
        <div className="space-y-5">
          {/* ====== Platform hero ====== */}
          <HomeHero
            eyebrow="Platform admin"
            title={<>{home.totalUsers} people · {home.propertyCount} properties · {home.roles.client} owner{home.roles.client === 1 ? '' : 's'} · {home.roles.guest || 0} guest{home.roles.guest === 1 ? '' : 's'}</>}
            aside={
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <HeroStat label="Revenue, 30 days" value={money(home.portfolio.totalRevenue)} sub={`${signedPct(change(home.portfolio.totalRevenue, home.previous.totalRevenue))} vs prior`} />
                <HeroStat label="Occupancy" value={pct(home.portfolio.occupancy)} sub={`market ${pct(home.portfolio.market.occupancy)}`} />
                <HeroStat label="Tools healthy" value={`${home.system.good}/${home.system.total}`} sub={`${home.system.critical} failing`} />
                <HeroStat label="Workflow errors" value={home.system.workflowErrors} sub="last 7 days" />
              </div>
            }
          >
            <p className="mt-2 text-[13px] text-white/70 max-w-md">Accounts, owners, listings going live, and whether every tool is still syncing.</p>
          </HomeHero>

          <GoLiveChecklist />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {overview && (
              <RevenueReport trend={overview.trend} days={days} onDaysChange={(d) => dispatch(setDays(d))} className="xl:col-span-2" title="Portfolio revenue" />
            )}

            {/* ====== People by role ====== */}
            <Panel
              title="People by role"
              source="All accounts"
              rule="New sign-ups are always owners. Promote staff from the Users page."
              action={<Link to="/dashboard/users" className="text-[12px] font-semibold text-accent">Manage users</Link>}
            >
              <ul className="space-y-3">
                {Object.entries(home.roles).map(([role, count]) => (
                  <li key={role}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="text-ink-2">{ROLE_NAMES[role]}</span>
                      <span className="font-semibold tabular">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-mint">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${(count / maxRole) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              {home.unverified > 0 && <p className="mt-4 text-[12px] text-muted">{home.unverified} account(s) have not verified their email yet.</p>}
              <h3 className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Newest accounts</h3>
              <ul className="space-y-2">
                {home.recentUsers.map((u) => (
                  <li key={u._id} className="flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-full bg-primary-soft text-primary text-[11px] font-bold flex items-center justify-center shrink-0">{initials(u.fullName)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold truncate">{u.fullName}</span>
                      <span className="block text-[11px] text-muted truncate">{ROLE_SINGLE[u.role]} · {u.authProvider === 'google' ? 'Google' : 'Email'} · {timeAgo(u.createdAt)}</span>
                    </span>
                    {!u.isVerified && <StatusBadge level="pending">Unverified</StatusBadge>}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
            {/* ====== Owners ====== */}
            <Panel title="Owners" source="Clients and their properties · last 30 days" rule="Worried if an owner has no property after a week: help them finish onboarding.">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] tabular">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                      <th className="py-2 pr-3 font-semibold">Owner</th>
                      <th className="py-2 pr-3 font-semibold">Properties</th>
                      <th className="py-2 pr-3 font-semibold text-right">Revenue</th>
                      <th className="py-2 pr-3 font-semibold text-right">Occupancy</th>
                      <th className="py-2 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/70">
                    {home.owners.map((o) => (
                      <tr key={o._id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold">{o.fullName}</p>
                          <p className="text-[11px] text-muted">{o.email}</p>
                        </td>
                        <td className="py-2.5 pr-3">{o.properties.length ? o.properties.join(', ') : <StatusBadge level="warning">None yet</StatusBadge>}</td>
                        <td className="py-2.5 pr-3 text-right">{money(o.revenue)}</td>
                        <td className="py-2.5 pr-3 text-right">{o.properties.length ? pct(o.occupancy) : '–'}</td>
                        <td className="py-2.5 text-[12px] text-ink-2">{timeAgo(o.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="space-y-5">
              {/* ====== Audit queue ====== */}
              <Panel title="Listings waiting for audit" source="Added by owners" rule="A listing goes live on the public site once it is audited and has a photo.">
                {home.auditQueue.length === 0 ? (
                  <StatusBadge level="good">All listings audited</StatusBadge>
                ) : (
                  <ul className="space-y-2.5">
                    {home.auditQueue.map((p) => (
                      <li key={p._id} className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-xl bg-mint text-primary flex items-center justify-center shrink-0"><FiClipboard size={14} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold truncate">{p.code} · {p.name}</span>
                          <span className="block text-[11px] text-muted truncate">{p.city}, {p.state} · {p.owner?.fullName}</span>
                        </span>
                        <Link to="/dashboard/listings" className="text-[12px] font-semibold text-accent">Audit</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {/* ====== System health ====== */}
              <Panel title="System health" source="Integrations + n8n" action={<Link to="/dashboard/integrations" className="text-[12px] font-semibold text-accent">Details</Link>}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['good', 'Normal', home.system.good],
                    ['warning', 'Watch', home.system.warning],
                    ['critical', 'Failing', home.system.critical],
                  ].map(([level, name, value]) => (
                    <div key={level} className="rounded-2xl bg-mint px-3 py-2.5">
                      <p className="text-[20px] font-bold">{value}</p>
                      <StatusBadge level={level}>{name}</StatusBadge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
                  <Link to="/dashboard/users" className="flex items-center gap-1.5 text-ink-2 hover:text-accent"><FiUsers size={12} /> Users</Link>
                  <Link to="/dashboard/listings" className="flex items-center gap-1.5 text-ink-2 hover:text-accent"><FiHome size={12} /> Listings</Link>
                  <Link to="/dashboard/integrations" className="flex items-center gap-1.5 text-ink-2 hover:text-accent"><FiServer size={12} /> Tools</Link>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </StateBlock>
  )
}

export default AdminHome
