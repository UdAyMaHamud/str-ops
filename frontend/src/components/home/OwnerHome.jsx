import React from 'react'
import { Link } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { FiHome, FiPlus, FiArrowRight, FiStar, FiTool, FiCalendar } from 'react-icons/fi'
import { useGetOverviewQuery } from '../../store/api/overviewApi'
import { useGetOwnerHomeQuery } from '../../store/api/homeApi'
import { selectDays, selectProperty, setDays } from '../../store/slices/filterSlice'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import StateBlock from '../common/StateBlock'
import HomeHero, { HeroStat } from './HomeHero'
import RevenueReport from './RevenueReport'
import CostBreakdown from './CostBreakdown'
import { money, pct, fmtShortDate, imgUrl, label } from '../common/format'

const NIGHT_STYLE = {
  guest: 'bg-primary text-white',
  owner: 'bg-[#cdd6cf] text-ink-2',
  open: 'bg-white border border-line text-muted',
}

const OwnerHome = () => {
  const dispatch = useDispatch()
  const property = useSelector(selectProperty)
  const days = useSelector(selectDays)
  const { data: homeData, isLoading, error } = useGetOwnerHomeQuery(property, { pollingInterval: 120000 })
  const { data: overviewData } = useGetOverviewQuery({ property, days })
  const home = homeData?.data
  const overview = overviewData?.data

  // ====== New owner with no properties yet
  if (home && home.properties === 0) {
    return (
      <div className="rounded-[32px] bg-white border border-line/70 px-8 py-14 text-center max-w-2xl mx-auto mt-6">
        <span className="mx-auto h-14 w-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center"><FiHome size={24} /></span>
        <h2 className="mt-5 text-[24px] font-bold">Add your first property</h2>
        <p className="mt-2 text-[14px] text-ink-2 max-w-md mx-auto">
          Once your property is added, this page fills with earnings, your calendar, upcoming guests, reviews and repairs.
        </p>
        <Link to="/dashboard/properties/new" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary text-white px-6 py-3 text-[14px] font-semibold active:scale-95">
          <FiPlus /> Add property
        </Link>
      </div>
    )
  }

  return (
    <StateBlock isLoading={isLoading} error={error}>
      {home && (
        <div className="space-y-5">
          {/* ====== Earnings hero ====== */}
          <HomeHero
            eyebrow={`Your earnings · ${home.earnings.monthName}`}
            title={<>{money(home.earnings.projected)} <span className="text-white/60 text-[18px] font-semibold">projected net this month</span></>}
            aside={
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <HeroStat label="Earned so far" value={money(home.earnings.monthToDate)} sub="after fees & costs" />
                <HeroStat label="On the books" value={money(home.earnings.onTheBooks)} sub="rest of the month" />
                <HeroStat label="Last month" value={money(home.earnings.lastMonth)} sub="net" />
                <HeroStat label="Next 30 nights" value={pct(home.next30.occupancy)} sub={`${home.next30.bookedNights}/${home.next30.availableNights} booked`} />
              </div>
            }
          >
            <p className="mt-2 text-[13px] text-white/70 max-w-md">Net is what's left for you after OTA fees, cleaning and software. Payouts follow each guest's checkout.</p>
          </HomeHero>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.7fr] gap-5 items-start">
            {/* ====== Decisions ====== */}
            <Panel title="Decisions we need from you" source="From your operations team" rule="We never go outside your price limits or accept a risky booking without asking you.">
              {home.decisions.length === 0 ? (
                <div className="py-6 text-center"><StatusBadge level="good">Nothing needs you</StatusBadge></div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {home.decisions.map((d, i) => {
                    const body = (
                      <>
                        <StatusBadge level={d.level}>{d.level === 'critical' ? 'Decide' : d.level === 'warning' ? 'Review' : 'FYI'}</StatusBadge>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-snug">{d.title}</p>
                          <p className="text-[12px] text-muted">{d.detail}</p>
                        </div>
                        {d.link && <FiArrowRight className="mt-1 text-muted shrink-0" size={14} />}
                      </>
                    )
                    return (
                      <li key={i}>
                        {d.link ? (
                          <Link to={`/dashboard${d.link}`} className="flex items-start gap-3 py-2.5 hover:text-accent">{body}</Link>
                        ) : (
                          <div className="flex items-start gap-3 py-2.5">{body}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            {/* ====== 14-night calendar ====== */}
            <Panel title="Your calendar · next 14 nights" source="PMS reservations" rule="Dark = guest booked, grey = your own stay, white = still open.">
              <div className="overflow-x-auto">
                <div className="min-w-[620px] space-y-3">
                  <div className="grid grid-cols-[150px_repeat(14,1fr)] gap-1 text-[10px] text-muted">
                    <span />
                    {home.calendar[0]?.nights.map((n) => (
                      <span key={n.date} className="text-center">
                        {new Date(n.date).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })}
                        <br />
                        {new Date(n.date).getUTCDate()}
                      </span>
                    ))}
                  </div>
                  {home.calendar.map((p) => (
                    <div key={p._id} className="grid grid-cols-[150px_repeat(14,1fr)] gap-1 items-center">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {p.image ? <img src={imgUrl(p.image)} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" /> : <span className="h-8 w-8 rounded-lg bg-mint shrink-0" />}
                        <span className="text-[12px] font-semibold truncate">{p.name}</span>
                      </div>
                      {p.nights.map((n) => (
                        <span
                          key={n.date}
                          title={`${fmtShortDate(n.date)} · ${n.state === 'guest' ? `Guest ${n.code}` : n.state === 'owner' ? 'Owner stay' : 'Open'}`}
                          className={`relative h-9 rounded-lg ${NIGHT_STYLE[n.state]}`}
                        >
                          {n.arrival && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#9cd3ad]" />}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-2">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-primary" /> Guest</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#cdd6cf]" /> Your stay</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-line bg-white" /> Open</span>
                <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#9cd3ad] ring-2 ring-primary" /> Arrival</span>
              </div>
            </Panel>
          </div>

          {overview && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <RevenueReport trend={overview.trend} days={days} onDaysChange={(d) => dispatch(setDays(d))} className="xl:col-span-2" title="Your revenue" />
              <CostBreakdown costs={overview.costBreakdown} days={days} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr] gap-5 items-start">
            {/* ====== Upcoming stays ====== */}
            <Panel title="Upcoming stays" source="Next 30 days" rule="Payout is an estimate: booking total − OTA fee − cleaning.">
              {home.upcomingStays.length === 0 ? (
                <p className="text-[13px] text-muted py-4">No guests booked in the next 30 days yet.</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {home.upcomingStays.map((s) => (
                    <li key={s._id} className="flex items-center gap-3 py-2.5">
                      <span className="h-11 w-11 rounded-xl bg-mint text-primary flex flex-col items-center justify-center shrink-0 leading-none">
                        <span className="text-[10px] uppercase">{new Date(s.checkIn).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
                        <span className="text-[16px] font-bold">{new Date(s.checkIn).getUTCDate()}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold truncate">{s.guestFirstName} · {s.nights} nights · {s.guests} guests</p>
                        <p className="text-[11px] text-muted truncate">{s.property.name} · {s.channel} · <span className="font-mono">{s.code}</span></p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold tabular">{money(s.payout)}</p>
                        <p className="text-[10px] text-muted">est. payout</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ====== Reviews ====== */}
            <Panel
              title="Guest reviews"
              source="Airbnb, VRBO, Booking.com"
              action={<Link to="/dashboard/reviews" className="text-[12px] font-semibold text-accent">See all</Link>}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[34px] font-bold leading-none">{home.reviews.avgRating ?? '–'}</span>
                <div>
                  <span className="flex">{[1, 2, 3, 4, 5].map((n) => <FiStar key={n} size={14} className={n <= Math.round(home.reviews.avgRating || 0) ? 'fill-warning text-warning' : 'text-line'} />)}</span>
                  <p className="text-[11px] text-muted">{home.reviews.count} reviews</p>
                </div>
              </div>
              <ul className="space-y-3">
                {home.reviews.latest.map((r) => (
                  <li key={r._id} className="rounded-2xl bg-mint px-3 py-2.5">
                    <p className="text-[12px] font-semibold">{r.rating}★ · {r.property?.name}</p>
                    <p className="text-[12px] text-ink-2 line-clamp-2">{r.text}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* ====== Repairs ====== */}
            <Panel
              title="Repairs in progress"
              source="Maintenance tickets"
              rule="You hear from us before any repair over your approval limit."
              action={<Link to="/dashboard/maintenance" className="text-[12px] font-semibold text-accent">See all</Link>}
            >
              {!overview?.openTickets?.length ? (
                <div className="py-6 text-center"><StatusBadge level="good">Nothing open</StatusBadge></div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {overview.openTickets.map((t) => (
                    <li key={t._id} className="flex items-start gap-3 py-2.5">
                      <span className="h-9 w-9 rounded-xl bg-mint text-primary flex items-center justify-center shrink-0"><FiTool size={14} /></span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{t.issue}</p>
                        <p className="text-[11px] text-muted">{t.property?.code} · {t.vendor || 'Finding a vendor'} · {label(t.status)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* ====== Properties vs market ====== */}
          {overview && (
            <Panel title="Your properties vs the local market" source="Last 30 days" rule="If occupancy is well below market while your nightly rate is above it, the price is probably too high.">
              <div className="grid gap-4 sm:grid-cols-2">
                {overview.byProperty.map((p) => {
                  const hasMarket = p.market.occupancy > 0
                  return (
                    <div key={p._id} className="rounded-2xl border border-line/70 p-4">
                      <p className="text-[14px] font-bold">{p.name}</p>
                      <p className="text-[11px] text-muted mb-3">{p.city}, {p.state}</p>
                      {[
                        ['Occupancy', p.occupancy, p.market.occupancy, pct],
                        ['Nightly rate', p.adr, p.market.adr, money],
                      ].map(([name, mine, market, fmt]) => (
                        <div key={name} className="mb-2">
                          <div className="flex justify-between text-[12px]">
                            <span className="text-ink-2">{name}</span>
                            <span className="tabular"><span className="font-semibold">{fmt(mine)}</span>{hasMarket && <span className="text-muted"> · market {fmt(market)}</span>}</span>
                          </div>
                          <div className="relative h-2 rounded-full bg-mint mt-1">
                            <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, (mine / Math.max(mine, market || 0, 1)) * 100)}%` }} />
                            {hasMarket && <span className="absolute top-[-3px] h-3.5 w-0.5 bg-ink" style={{ left: `${Math.min(100, (market / Math.max(mine, market, 1)) * 100)}%` }} title="Market" />}
                          </div>
                        </div>
                      ))}
                      <p className="mt-2 text-[12px]"><span className="text-muted">Revenue</span> <span className="font-semibold">{money(p.totalRevenue)}</span> · <span className="text-muted">your net</span> <span className="font-semibold">{money(p.hostNet)}</span></p>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          <p className="flex items-center gap-1.5 text-[12px] text-muted"><FiCalendar size={12} /> Your full monthly statement is in <Link to="/dashboard/owner-report" className="text-accent font-semibold">Owner Report</Link>.</p>
        </div>
      )}
    </StateBlock>
  )
}

export default OwnerHome
