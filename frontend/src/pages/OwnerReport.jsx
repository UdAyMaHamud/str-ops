import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { FiPrinter } from 'react-icons/fi'
import { useGetOwnerReportQuery } from '../store/api/revenueApi'
import { useGetPropertiesQuery } from '../store/api/overviewApi'
import { selectProperty } from '../store/slices/filterSlice'
import PageHeader from '../components/common/PageHeader'
import StateBlock from '../components/common/StateBlock'
import PropertyPicker from '../components/common/PropertyPicker'
import { money, pct, signedPct, change } from '../components/common/format'

const lastMonth = () => {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// ====== One numbered report section
const Section = ({ n, title, children }) => (
  <section className="py-4 border-t border-line first:border-t-0">
    <h2 className="text-[12px] font-semibold uppercase tracking-wider text-accent mb-2">{n}. {title}</h2>
    {children}
  </section>
)

const OwnerReport = () => {
  const globalProperty = useSelector(selectProperty)
  const { data: propertyData } = useGetPropertiesQuery()
  const [propertyId, setPropertyId] = useState('')
  const [month, setMonth] = useState(lastMonth())

  useEffect(() => {
    if (globalProperty !== 'all') setPropertyId(globalProperty)
    else if (!propertyId && propertyData?.data?.length) setPropertyId(propertyData.data[0]._id)
  }, [globalProperty, propertyData, propertyId])

  const { data, isLoading, error } = useGetOwnerReportQuery({ property: propertyId, month }, { skip: !propertyId })
  const report = data?.data
  const cur = report?.numbers.current
  const prev = report?.numbers.previous
  const market = report?.numbers.market

  return (
    <>
      <PageHeader title="Owner Report" subtitle="One page (Template F): how did we do, and what happens next. Print or save as PDF for the owner.">
        {propertyId && <PropertyPicker value={propertyId} onChange={setPropertyId} />}
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] cursor-pointer"
          aria-label="Report month"
        />
        <button onClick={() => window.print()} className="flex items-center gap-1.5 h-9 rounded-lg bg-primary text-white px-3 text-[13px] cursor-pointer active:scale-95">
          <FiPrinter size={14} /> Print / PDF
        </button>
      </PageHeader>

      <StateBlock isLoading={isLoading || !propertyId} error={error}>
        {report && (
          <article className="bg-white rounded-2xl border border-line px-6 md:px-10 py-8 max-w-4xl">
            <header className="mb-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Owner statement · {report.monthName}</p>
              <h1 className="text-[22px] font-semibold text-primary">{report.property.name}</h1>
              <p className="text-[12px] text-ink-2">{report.property.city}, {report.property.state} · {report.property.bedrooms} BR</p>
            </header>

            <Section n={1} title="Headline">
              <p className="text-[15px] font-medium">{report.headline}</p>
            </Section>

            <Section n={2} title="Numbers">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] tabular">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                      <th className="py-1.5 pr-3 font-semibold">Metric</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">This month</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">Last month</th>
                      <th className="py-1.5 pr-3 font-semibold text-right">Change</th>
                      <th className="py-1.5 font-semibold text-right">Market</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[
                      ['Revenue', money(cur.totalRevenue), money(prev.totalRevenue), change(cur.totalRevenue, prev.totalRevenue), '–'],
                      ['Occupancy', pct(cur.occupancy), pct(prev.occupancy), change(cur.occupancy, prev.occupancy), market ? pct(market.occupancy) : "–"],
                      ['ADR', money(cur.adr), money(prev.adr), change(cur.adr, prev.adr), market ? money(market.adr) : "–"],
                      ['RevPAR', money(cur.revpar), money(prev.revpar), change(cur.revpar, prev.revpar), market ? money(market.revpar) : "–"],
                    ].map(([name, now, before, delta, mkt]) => (
                      <tr key={name}>
                        <td className="py-1.5 pr-3">{name}</td>
                        <td className="py-1.5 pr-3 text-right font-semibold">{now}</td>
                        <td className="py-1.5 pr-3 text-right text-ink-2">{before}</td>
                        <td className={`py-1.5 pr-3 text-right ${delta > 0 ? 'text-good-text' : delta < 0 ? 'text-critical' : ''}`}>{signedPct(delta)}</td>
                        <td className="py-1.5 text-right text-ink-2">{mkt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section n={3} title="Bookings">
              <p className="text-[13px]">
                {report.bookings.stays} stays · average {report.bookings.avgLengthOfStay} nights ·{' '}
                {report.bookings.channelSplit.map((c) => `${c.channel} ${pct(c.share)}`).join(', ') || 'no bookings'}
              </p>
            </Section>

            <Section n={4} title="Guest feedback">
              <p className="text-[13px]">
                {report.feedback.count ? `${report.feedback.count} review(s), average ${report.feedback.avgRating} ★` : 'No new reviews this month.'}
              </p>
              {report.feedback.bestQuote && <blockquote className="mt-2 border-l-2 border-accent pl-3 text-[13px] italic text-ink-2">“{report.feedback.bestQuote}”</blockquote>}
              {report.feedback.issues.map((i, k) => (
                <p key={k} className="mt-2 text-[13px]">
                  <span className="font-semibold">Issue:</span> {i.text} <span className="text-ink-2">· {i.fixed ? `Fixed: ${i.reply}` : 'Fix in progress'}</span>
                </p>
              ))}
            </Section>

            <Section n={5} title="Operations">
              <p className="text-[13px] mb-2">{report.operations.turnovers} turnovers completed.</p>
              {report.operations.maintenance.length > 0 && (
                <ul className="text-[13px] list-disc pl-5 mb-2">
                  {report.operations.maintenance.map((m, i) => <li key={i}>{m.issue} ({m.status.replace('_', ' ')}{m.cost ? `, ${money(m.cost)}` : ''})</li>)}
                </ul>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[12px] tabular">
                {[
                  ['OTA fees', report.operations.costs.otaFees],
                  ['Cleaning', report.operations.costs.cleaning],
                  ['Software', report.operations.costs.software],
                  ['Maintenance', report.operations.costs.maintenance],
                  ['Owner net', report.operations.hostNetAfterMaintenance],
                ].map(([name, value]) => (
                  <div key={name} className={`rounded-lg px-3 py-2 ${name === 'Owner net' ? 'bg-primary text-white' : 'bg-page'}`}>
                    <p className={name === 'Owner net' ? 'text-white/70' : 'text-muted'}>{name}</p>
                    <p className="font-semibold text-[14px]">{money(value)}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section n={6} title="Next month">
              <p className="text-[13px]"><span className="font-semibold">Pricing plan:</span> {report.nextMonth.pricingPlan}</p>
              <p className="text-[13px] mt-1"><span className="font-semibold">Upcoming events:</span> {report.nextMonth.events.join(', ') || 'None found'}</p>
              {report.nextMonth.ownerDecisions.length > 0 && (
                <div className="mt-2">
                  <p className="text-[13px] font-semibold">Decisions we need from you:</p>
                  <ul className="text-[13px] list-disc pl-5">{report.nextMonth.ownerDecisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
            </Section>
          </article>
        )}
      </StateBlock>
    </>
  )
}

export default OwnerReport
