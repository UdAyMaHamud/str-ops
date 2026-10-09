import React, { useState } from 'react'
import { Link } from 'react-router'
import { useSelector } from 'react-redux'
import { FiPlus, FiHome } from 'react-icons/fi'
import { useGetPropertiesQuery } from '../store/api/overviewApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectCurrentUser } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import AuditForm from '../components/admin/AuditForm'
import OwnerPicker from '../components/admin/OwnerPicker'
import { money, pct, fmtShortDate, imgUrl } from '../components/common/format'

const SCORE_STYLE = ['bg-critical/80', 'bg-warning', 'bg-good']

const Listings = () => {
  const property = useSelector(selectProperty)
  const user = useSelector(selectCurrentUser)
  const canAdd = ['client', 'admin'].includes(user?.role)
  // Seniors and admins score listings; an audited listing with a photo goes live on the public site
  const canAudit = ['senior', 'admin'].includes(user?.role)
  const [auditing, setAuditing] = useState('')
  const { data, isLoading, error } = useGetPropertiesQuery()
  const checks = data?.checks || []
  const properties = (data?.data || []).filter((p) => property === 'all' || p._id === property)

  return (
    <>
      <PageHeader title="Properties" subtitle="Each listing scored on the Listing Audit Checklist: 8 checks, 0 to 2 points each. Lowest scores get fixed first.">
        {canAdd && (
          <Link to="/dashboard/properties/new" className="flex items-center gap-1.5 h-10 rounded-full bg-primary text-white px-4 text-[13px] font-semibold active:scale-95">
            <FiPlus /> Add property
          </Link>
        )}
      </PageHeader>
      <StateBlock isLoading={isLoading} error={error} isEmpty={!properties.length} emptyText="No properties yet">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {properties.map((p) => {
            const ratio = p.auditTotal / p.auditMax
            return (
              <Panel
                key={p._id}
                title={`${p.code} · ${p.name}`}
                source={`${p.city}, ${p.state} · ${p.bedrooms} BR · ${p.tier} tier${p.owner?.fullName && user?.role !== 'client' ? ` · owner ${p.owner.fullName}` : ''}`}
                rule="Worried below 12/16, or if any check scores 0."
                action={
                  <div className="flex items-center gap-2">
                    {p.isAudited ? (
                      <StatusBadge level={ratio >= 0.75 ? 'good' : ratio >= 0.5 ? 'warning' : 'critical'}>{p.auditTotal}/{p.auditMax}</StatusBadge>
                    ) : (
                      <StatusBadge level="pending">Audit pending</StatusBadge>
                    )}
                    {canAudit && (
                      <button onClick={() => setAuditing(auditing === p._id ? '' : p._id)} className="text-[12px] font-semibold text-accent cursor-pointer">
                        {auditing === p._id ? 'Cancel' : p.isAudited ? 'Re-audit' : 'Audit now'}
                      </button>
                    )}
                  </div>
                }
              >
                {user?.role === 'admin' && <OwnerPicker property={p} />}
                <div className="flex gap-4 mb-4">
                  {p.image ? (
                    <img src={imgUrl(p.image)} alt={p.name} className="h-24 w-32 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <span className="h-24 w-32 rounded-2xl bg-mint text-muted flex items-center justify-center shrink-0"><FiHome size={24} /></span>
                  )}
                  <div className="min-w-0 text-[12px] space-y-1.5">
                    {p.description && <p className="text-ink-2 line-clamp-2">{p.description}</p>}
                    <p><span className="text-muted">Base</span> {money(p.basePrice)} <span className="text-muted">· range</span> {money(p.minPrice)}–{money(p.maxPrice)}</p>
                    {p.marketAdr > 0 && <p><span className="text-muted">Market ADR</span> {money(p.marketAdr)}</p>}
                    <div className="flex flex-wrap gap-1">{p.channels.map((c) => <StatusBadge key={c} level="neutral">{c}</StatusBadge>)}</div>
                  </div>
                </div>

                {auditing === p._id ? (
                  <AuditForm property={p} checks={checks} onDone={() => setAuditing('')} />
                ) : p.isAudited ? (
                  <>
                    <div className="h-2 rounded-full bg-mint mb-3">
                      <div className="h-2 rounded-full bg-accent" style={{ width: pct(ratio) }} />
                    </div>
                    <ol className="space-y-1.5">
                      {checks.map((c, i) => {
                        const score = p.audit?.scores?.[i] ?? 0
                        return (
                          <li key={i} className="flex items-start gap-2.5 text-[12px]">
                            <span className="flex gap-0.5 mt-1 shrink-0" aria-label={`Score ${score} of 2`}>
                              {[0, 1].map((n) => <span key={n} className={`h-2 w-4 rounded-sm ${n < score ? SCORE_STYLE[score] : 'bg-mint'}`} />)}
                            </span>
                            <span className={score === 0 ? 'text-critical font-medium' : 'text-ink-2'}>
                              {c} <span className="text-muted">({score})</span>
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                    <p className="mt-3 text-[12px]">
                      <span className="font-semibold">Missing amenity tags:</span>{' '}
                      <span className="text-ink-2">{p.audit?.missingAmenities?.join(', ') || 'None'}</span>
                      <span className="text-muted"> · audited {p.audit?.auditedAt ? fmtShortDate(p.audit.auditedAt) : '–'}</span>
                    </p>
                  </>
                ) : (
                  <p className="rounded-2xl bg-mint px-4 py-3 text-[13px] text-ink-2">
                    Our team will score this listing on the 8-point audit (title, photos, description, amenities, rules, price, reviews) within 2 working days.
                  </p>
                )}
              </Panel>
            )
          })}
        </div>
      </StateBlock>
    </>
  )
}

export default Listings
