import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Line } from 'react-chartjs-2'
import { FiCopy } from 'react-icons/fi'
import { useGetPricingQuery } from '../store/api/revenueApi'
import { useGetPropertiesQuery } from '../store/api/overviewApi'
import { selectProperty } from '../store/slices/filterSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import PropertyPicker from '../components/common/PropertyPicker'
import { baseOptions, SERIES } from '../components/common/chartSetup'
import { money, pct, signedPct, fmtShortDate, fmtDate } from '../components/common/format'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const Pricing = () => {
  const globalProperty = useSelector(selectProperty)
  const { data: propertyData } = useGetPropertiesQuery()
  const [propertyId, setPropertyId] = useState('')

  // Follow the global filter, else default to the first property
  useEffect(() => {
    if (globalProperty !== 'all') setPropertyId(globalProperty)
    else if (!propertyId && propertyData?.data?.length) setPropertyId(propertyData.data[0]._id)
  }, [globalProperty, propertyData, propertyId])

  const { data, isLoading, error } = useGetPricingQuery(propertyId, { skip: !propertyId })
  const pricing = data?.data
  const days = pricing?.days || []
  const reviewRows = days.filter((d) => !d.booked && (d.suggestedPrice !== d.currentPrice || d.event || d.belowMin || d.aboveMax))

  // Calendar: pad the first week so columns line up with weekdays
  const firstWeekday = days.length ? new Date(days[0].date).getUTCDay() : 0
  const cells = [...Array(firstWeekday).fill(null), ...days]

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pricing.ownerSummary.join('\n'))
      toast.success('Owner summary copied', { duration: 2000, position: 'top-center' })
    } catch (err) {
      console.log(err)
      toast.error('Copy failed', { position: 'top-center' })
    }
  }

  return (
    <>
      <PageHeader title="Pricing" subtitle="Weekly pricing routine (Day 7): events, gap nights, min/max sanity check and a 5-line owner summary. Suggestions only.">
        {propertyId && <PropertyPicker value={propertyId} onChange={setPropertyId} />}
      </PageHeader>

      <StateBlock isLoading={isLoading || !propertyId} error={error}>
        {pricing && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard title="Booked, next 60 days" value={pct(pricing.summary.bookedPct)} sub={`${pricing.property.name}`} />
              <StatCard title="Avg current price" value={money(pricing.summary.avgCurrent)} sub={`base ${money(pricing.property.basePrice)}`} />
              <StatCard title="Min / max" value={`${money(pricing.property.minPrice)}–${money(pricing.property.maxPrice)}`} sub="owner limits" />
              <StatCard title="Gap nights" value={pricing.summary.gapNights} sub="single empty nights" />
              <StatCard title="Out of range" value={pricing.summary.outOfRange} sub="below min or above max" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 items-start">
              {/* ====== 60-day calendar ====== */}
              <Panel title="60-day calendar" source="PriceLabs (polling hourly) + PMS bookings" rule="Worried if a price is outside the owner's min/max, or a single night sits empty between two bookings.">
                <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-ink-2">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-primary/85" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-300" /> Owner block</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-line bg-white" /> Open</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded ring-2 ring-warning bg-white" /> Gap night</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" /> Event</span>
                  <span className="flex items-center gap-1"><span className="font-bold text-critical">!</span> Outside min/max</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((w) => <p key={w} className="text-center text-[10px] uppercase tracking-wider text-muted pb-1">{w}</p>)}
                  {cells.map((d, i) =>
                    d ? (
                      <div
                        key={i}
                        title={`${fmtDate(d.date)} · ${money(d.currentPrice)}${d.suggestedPrice !== d.currentPrice ? ` → ${money(d.suggestedPrice)}` : ''}${d.event ? ` · ${d.event}` : ''}${d.reservationCode ? ` · ${d.reservationCode}` : ''}`}
                        className={`relative rounded-lg px-1.5 py-1 min-h-[52px] text-[11px] ${
                          d.booked
                            ? d.bookingType === 'owner_block' ? 'bg-slate-300 text-ink-2' : 'bg-primary/85 text-white'
                            : 'bg-white border border-line'
                        } ${d.gapNight ? 'ring-2 ring-warning' : ''}`}
                      >
                        <p className={`text-[10px] ${d.booked ? 'opacity-70' : 'text-muted'}`}>{fmtShortDate(d.date)}</p>
                        <p className="font-semibold tabular">
                          {money(d.currentPrice)}
                          {(d.belowMin || d.aboveMax) && <span className="ml-0.5 text-critical font-bold">!</span>}
                        </p>
                        {!d.booked && d.suggestedPrice !== d.currentPrice && (
                          <p className={`tabular ${d.suggestedPrice > d.currentPrice ? 'text-good-text' : 'text-[#8a3a17]'}`}>→ {money(d.suggestedPrice)}</p>
                        )}
                        {d.event && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent" />}
                      </div>
                    ) : (
                      <div key={i} />
                    )
                  )}
                </div>
              </Panel>

              {/* ====== Owner summary ====== */}
              <Panel
                title="Owner summary (5 lines)"
                source="Auto-drafted. Edit before sending."
                rule="Could the owner read this in 30 seconds and know what changed and why?"
                action={<button onClick={handleCopy} className="flex items-center gap-1 text-[12px] text-accent cursor-pointer"><FiCopy size={12} /> Copy</button>}
              >
                <ol className="space-y-2 list-decimal pl-4">
                  {pricing.ownerSummary.map((line, i) => <li key={i} className="text-[13px]">{line}</li>)}
                </ol>
              </Panel>
            </div>

            {/* ====== Price line ====== */}
            <Panel title="Current vs suggested price" source="Next 60 days">
              <div className="flex gap-4 mb-2 text-[12px]">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: SERIES[0] }} /> Current</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: SERIES[1] }} /> Suggested</span>
              </div>
              <div className="h-56">
                <Line
                  data={{
                    labels: days.map((d) => fmtShortDate(d.date)),
                    datasets: [
                      { label: 'Current', data: days.map((d) => d.currentPrice), borderColor: SERIES[0], backgroundColor: SERIES[0], borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.25 },
                      { label: 'Suggested', data: days.map((d) => d.suggestedPrice), borderColor: SERIES[1], backgroundColor: SERIES[1], borderWidth: 2, borderDash: [5, 4], pointRadius: 0, pointHoverRadius: 4, tension: 0.25 },
                    ],
                  }}
                  options={{
                    ...baseOptions,
                    plugins: { ...baseOptions.plugins, tooltip: { ...baseOptions.plugins.tooltip, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${money(ctx.raw)}` } } },
                    scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, beginAtZero: false, ticks: { callback: (v) => money(v) } } },
                  }}
                />
              </div>
            </Panel>

            {/* ====== Pricing review table (Template A) ====== */}
            <Panel title="Pricing review" source="Template A · open nights only" rule="Every change needs a one-line reason the owner understands.">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] tabular">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                      <th className="py-2 pr-3 font-semibold">Date</th>
                      <th className="py-2 pr-3 font-semibold">Event / reason</th>
                      <th className="py-2 pr-3 font-semibold text-right">Current</th>
                      <th className="py-2 pr-3 font-semibold text-right">Suggested</th>
                      <th className="py-2 pr-3 font-semibold text-right">Change</th>
                      <th className="py-2 pr-3 font-semibold text-right">Min stay</th>
                      <th className="py-2 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {reviewRows.map((d) => (
                      <tr key={d.index}>
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(d.date)}</td>
                        <td className="py-2 pr-3">{d.event || (d.gapNight ? 'Gap night' : 'Demand adjustment')}</td>
                        <td className="py-2 pr-3 text-right">{money(d.currentPrice)}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{money(d.suggestedPrice)}</td>
                        <td className={`py-2 pr-3 text-right ${d.changePct > 0 ? 'text-good-text' : d.changePct < 0 ? 'text-[#8a3a17]' : ''}`}>{signedPct(d.changePct)}</td>
                        <td className="py-2 pr-3 text-right">{d.minStay}</td>
                        <td className="py-2">
                          {(d.belowMin || d.aboveMax) && <StatusBadge level="critical">{d.belowMin ? 'Below owner min' : 'Above owner max'}</StatusBadge>}
                          {!d.belowMin && !d.aboveMax && <span className="text-ink-2">{d.note}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}
      </StateBlock>
    </>
  )
}

export default Pricing
