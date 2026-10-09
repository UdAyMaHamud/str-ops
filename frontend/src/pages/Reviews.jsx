import React from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiStar } from 'react-icons/fi'
import { useGetReviewsQuery, useGetClaimsQuery, useUpdateClaimMutation } from '../store/api/riskApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { money, fmtDate, fmtShortDate, label } from '../components/common/format'

const Stars = ({ rating }) => (
  <span className="inline-flex" aria-label={`${rating} of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <FiStar key={n} size={12} className={n <= rating ? 'fill-warning text-warning' : 'text-line'} />
    ))}
  </span>
)

const Reviews = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetReviewsQuery(property)
  const { data: claimData } = useGetClaimsQuery(property)
  const [updateClaim] = useUpdateClaimMutation()
  const reviews = data?.data || []
  const stats = data?.stats
  const claims = claimData?.data || []
  const checks = claimData?.checks || {}

  const handleCheck = async (id, check, value) => {
    try {
      await updateClaim({ id, check, value }).unwrap()
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <>
      <PageHeader title="Reviews & Claims" subtitle="Protect the listing in public and recover money after damage (Day 10). Reply short, professional, never defensive." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Average rating" value={stats ? `${stats.avgRating} ★` : '–'} sub={`${stats?.count || 0} reviews`} />
        <StatCard title="Negative (≤ 3★)" value={stats?.negative ?? '–'} />
        <StatCard title="Negative, no reply" value={stats?.negativeUnreplied ?? '–'} sub="reply within 48 h" />
        <StatCard title="Open claims" value={claims.filter((c) => c.status === 'open').length} sub="watch the filing deadline" />
      </div>

      <StateBlock isLoading={isLoading} error={error}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-start">
          <Panel title="Reviews" source="Airbnb / VRBO / Booking.com via channel manager · polling 15 min" rule="Worried if a negative review has no public reply after 48 hours.">
            <ul className="divide-y divide-line">
              {reviews.map((r) => (
                <li key={r._id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="text-[12px] font-medium">{r.property?.code} · {r.property?.name}</span>
                    <span className="text-[11px] text-muted">{r.channel} · {fmtShortDate(r.postedAt)} · <span className="font-mono">{r.reservationCode}</span></span>
                    {r.rating <= 3 && !r.reply && <StatusBadge level="critical">Needs reply</StatusBadge>}
                  </div>
                  <p className="text-[13px] mt-1">{r.text}</p>
                  {r.reply && <p className="mt-1.5 border-l-2 border-line pl-3 text-[12px] text-ink-2"><span className="font-semibold">Host reply:</span> {r.reply}</p>}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Damage claims" source="Claim Pack Checklist (Section 05 E)" rule="Airbnb asks for damage requests within 14 days of checkout. Check the current policy before filing.">
            {claims.length === 0 ? (
              <p className="text-[12px] text-muted">No claims</p>
            ) : (
              <ul className="space-y-4">
                {claims.map((c) => (
                  <li key={c._id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold">{c.issue}</p>
                        <p className="text-[11px] text-muted">{c.property?.code} · <span className="font-mono">{c.reservationCode}</span> · {c.channel} · {money(c.amount)}</p>
                      </div>
                      <StatusBadge level={c.status === 'paid' ? 'good' : c.status === 'denied' ? 'critical' : 'info'}>{label(c.status)}</StatusBadge>
                    </div>
                    {c.status === 'open' && (
                      <p className={`mt-2 text-[12px] font-semibold ${c.daysLeft <= 3 ? 'text-critical' : 'text-[#7a5200]'}`}>
                        {c.daysLeft > 0 ? `${c.daysLeft} day(s) left to file` : 'Deadline passed'} · deadline {fmtDate(c.deadline)}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted">Evidence pack {c.checklistDone}/{c.checklistTotal}</p>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(checks).map(([key, text]) => (
                        <li key={key}>
                          <label className={`flex items-center gap-2 text-[12px] ${isSenior ? 'cursor-pointer' : ''}`}>
                            <input
                              type="checkbox"
                              checked={!!c.checklist?.[key]}
                              disabled={!isSenior}
                              onChange={(e) => handleCheck(c._id, key, e.target.checked)}
                              className="accent-[#0b1f3a]"
                            />
                            <span className={c.checklist?.[key] ? 'text-ink-2 line-through' : ''}>{text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </StateBlock>
    </>
  )
}

export default Reviews
