import React from 'react'
import { Link } from 'react-router'
import toast from 'react-hot-toast'
import { FiCheck, FiExternalLink, FiCamera, FiShield, FiServer, FiAlertOctagon, FiLogIn, FiLogOut, FiRefreshCw, FiBell } from 'react-icons/fi'
import { useGetSeniorHomeQuery } from '../../store/api/homeApi'
import { useReviewDraftMutation } from '../../store/api/inboxApi'
import { useResolveEscalationMutation } from '../../store/api/systemApi'
import { useDecideBookingMutation } from '../../store/api/bookingApi'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import StateBlock from '../common/StateBlock'
import HomeHero, { HeroStat } from './HomeHero'
import { pct, timeAgo, fmtShortDate } from '../common/format'

const URGENCY = { now: ['critical', 'Now'], within_1_hr: ['serious', '1 hr'], today: ['warning', 'Today'] }

// Confidence 1-5 as five small bars, latest last
const ConfidenceTrend = ({ values }) => (
  <span className="inline-flex items-end gap-0.5 h-5" title={`Confidence: ${values.join(', ')}`}>
    {values.map((v, i) => (
      <span key={i} className={`w-1.5 rounded-sm ${v <= 2 ? 'bg-serious' : 'bg-accent'}`} style={{ height: `${v * 20}%` }} />
    ))}
  </span>
)

const SeniorHome = () => {
  const { data, isLoading, error } = useGetSeniorHomeQuery(undefined, { pollingInterval: 60000 })
  const [reviewDraft, { isLoading: approving }] = useReviewDraftMutation()
  const [resolveEscalation] = useResolveEscalationMutation()
  const [decideBooking, { isLoading: deciding }] = useDecideBookingMutation()
  const home = data?.data
  const queue = home?.queue

  const handleApprove = async (id) => {
    try {
      const res = await reviewDraft({ id, status: 'approved' }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  // ====== Booking requests from the public site
  const handleDecide = async (id, decision) => {
    if (decision === 'decline' && !window.confirm('Decline this booking request? The guest will see it as cancelled.')) return
    try {
      const res = await decideBooking({ id, decision }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  const handleResolve = async (id) => {
    try {
      const res = await resolveEscalation(id).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <StateBlock isLoading={isLoading} error={error}>
      {home && (
        <div className="space-y-5">
          {/* ====== Review queue hero ====== */}
          <HomeHero
            eyebrow="Senior on shift"
            title={queue.total ? <>{queue.total} items waiting for your review</> : 'Review queue is clear'}
            aside={
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
                <HeroStat label="Booking requests" value={queue.bookingRequests.length} sub="from the site" />
                <HeroStat label="Drafts" value={queue.pendingDrafts.length} sub="to approve" />
                <HeroStat label="Photo QC" value={queue.qcPending.length} sub="turnovers" />
                <HeroStat label="Escalations" value={queue.openEscalations.length} sub="from the team" />
                <HeroStat label="Screening" value={queue.screeningsDue.length} sub="arriving ≤ 7 days" />
              </div>
            }
          >
            <p className="mt-2 text-[13px] text-white/70 max-w-md">Trainees draft, you decide. Nothing reaches a real guest or owner without your approval.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
              {[
                ['Check-ins', home.today.checkIns, FiLogIn],
                ['Check-outs', home.today.checkOuts, FiLogOut],
                ['Turnovers', home.today.turnovers, FiRefreshCw],
                ['Open alerts', home.today.openAlerts, FiBell],
              ].map(([name, value, Icon]) => (
                <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><Icon size={12} /> {value} {name.toLowerCase()} today</span>
              ))}
            </div>
          </HomeHero>

          {/* ====== Booking requests ====== */}
          {queue.bookingRequests.length > 0 && (
            <Panel title="Booking requests" source="Guests on our site · nothing charged yet" rule="Answer within 24 hours. Check screening and the calendar before confirming.">
              <ul className="divide-y divide-line/70">
                {queue.bookingRequests.map((b) => (
                  <li key={b._id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{b.guestFirstName} · {b.property?.code} {b.property?.name} · <span className="font-mono text-[12px]">{b.code}</span></p>
                      <p className="text-[12px] text-muted">{fmtShortDate(b.checkIn)} → {fmtShortDate(b.checkOut)} · {b.nights} nights · {b.guests} guests · ${Math.round(b.total)} · requested {timeAgo(b.bookedAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={deciding} onClick={() => handleDecide(b._id, 'confirm')} className="inline-flex items-center gap-1.5 rounded-full bg-good text-white px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer active:scale-95"><FiCheck size={12} /> Confirm</button>
                      <button disabled={deciding} onClick={() => handleDecide(b._id, 'decline')} className="rounded-full border border-critical/40 text-critical px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer active:scale-95">Decline</button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-5 items-start">
            {/* ====== Drafts to approve ====== */}
            <Panel
              title="Drafts to approve"
              source="Oldest first"
              rule="Approve as-is, or open the inbox to edit or reject with feedback."
              action={<Link to="/dashboard/inbox" className="text-[12px] font-semibold text-accent">Open inbox</Link>}
            >
              {queue.pendingDrafts.length === 0 ? (
                <div className="py-6 text-center"><StatusBadge level="good">No drafts waiting</StatusBadge></div>
              ) : (
                <ul className="space-y-3">
                  {queue.pendingDrafts.map((d) => (
                    <li key={d._id} className="rounded-2xl border border-line/70 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span className="font-semibold text-ink text-[12px]">{d.author?.fullName}</span>
                        <span>· {d.type} · {d.property?.code} · <span className="font-mono">{d.reservationCode}</span> · {timeAgo(d.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-[13px] line-clamp-3">{d.body}</p>
                      <div className="mt-2.5 flex gap-2">
                        <button disabled={approving} onClick={() => handleApprove(d._id)} className="inline-flex items-center gap-1.5 rounded-full bg-good text-white px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer active:scale-95">
                          <FiCheck size={12} /> Approve & send
                        </button>
                        <Link to={`/dashboard/inbox?thread=${d.thread}`} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[12px] font-medium hover:bg-mint">
                          <FiExternalLink size={12} /> Edit or reject
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ====== Escalations ====== */}
            <Panel title="Escalations from the team" source="Escalation Report format" rule="Answer within the urgency the trainee chose.">
              {queue.openEscalations.length === 0 ? (
                <div className="py-6 text-center"><StatusBadge level="good">None open</StatusBadge></div>
              ) : (
                <ul className="space-y-3">
                  {queue.openEscalations.map((e) => (
                    <li key={e._id} className="rounded-2xl border border-line/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge level={URGENCY[e.urgency][0]}>{URGENCY[e.urgency][1]}</StatusBadge>
                        <span className="text-[12px] font-semibold">{e.property?.code} · {e.createdBy?.fullName}</span>
                        <span className="text-[11px] text-muted">{timeAgo(e.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-[13px]">{e.whatHappened}</p>
                      {e.suggestion && <p className="mt-1 text-[12px] text-ink-2"><span className="font-semibold">Suggests:</span> {e.suggestion}</p>}
                      <button onClick={() => handleResolve(e._id)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-white px-3.5 py-1.5 text-[12px] font-semibold cursor-pointer active:scale-95">
                        <FiCheck size={12} /> Mark resolved
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <Panel title="Photo QC waiting" source="Finished turnovers" action={<Link to="/dashboard/turnovers" className="text-[12px] font-semibold text-accent">Review</Link>}>
              {queue.qcPending.length === 0 ? (
                <StatusBadge level="good">All checked</StatusBadge>
              ) : (
                <ul className="space-y-2">
                  {queue.qcPending.map((t) => {
                    const fails = t.photoQc.filter((a) => a.pass === false)
                    return (
                      <li key={t._id} className="flex items-start gap-2.5 text-[12px]">
                        <FiCamera className="mt-0.5 text-accent shrink-0" />
                        <span>
                          <span className="font-semibold">{t.property?.code} · {t.property?.name}</span>
                          <span className="block text-muted">{t.cleaner}{fails.length ? ` · flagged: ${fails.map((f) => f.area).join(', ')}` : ''}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Screening decisions due" source="Arriving within 7 days" action={<Link to="/dashboard/screening" className="text-[12px] font-semibold text-accent">Decide</Link>}>
              {queue.screeningsDue.length === 0 ? (
                <StatusBadge level="good">Nothing due</StatusBadge>
              ) : (
                <ul className="space-y-2">
                  {queue.screeningsDue.map((s) => (
                    <li key={s._id} className="flex items-start gap-2.5 text-[12px]">
                      <FiShield className={`mt-0.5 shrink-0 ${s.riskScore >= 70 ? 'text-critical' : 'text-accent'}`} />
                      <span>
                        <span className="font-semibold font-mono">{s.reservationCode}</span> <span className="text-muted">· score {s.riskScore} · {fmtShortDate(s.checkIn)}</span>
                        <span className="block text-muted">{s.flags[0]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Systems needing you" source="Smart home + integrations" action={<Link to="/dashboard/integrations" className="text-[12px] font-semibold text-accent">Open</Link>}>
              {home.criticalAlerts.length + home.failingIntegrations.length === 0 ? (
                <StatusBadge level="good">All normal</StatusBadge>
              ) : (
                <ul className="space-y-2">
                  {home.criticalAlerts.map((a) => (
                    <li key={a._id} className="flex items-start gap-2.5 text-[12px]">
                      <FiAlertOctagon className="mt-0.5 text-critical shrink-0" />
                      <span><span className="font-semibold">{a.property?.code} · {a.type}</span><span className="block text-muted">{a.message}</span></span>
                    </li>
                  ))}
                  {home.failingIntegrations.map((i) => (
                    <li key={i._id} className="flex items-start gap-2.5 text-[12px]">
                      <FiServer className={`mt-0.5 shrink-0 ${i.level === 'critical' ? 'text-critical' : 'text-serious'}`} />
                      <span><span className="font-semibold">{i.name}</span><span className="block text-muted">{i.summary} · {i.statusMeaning}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {/* ====== Team ====== */}
          <Panel
            title="Your trainees"
            source="Draft Log + EOD reports"
            rule="Worried if a trainee's approval rate drops below 60%, confidence stays at 2 or less, or no EOD report by end of shift."
            action={<Link to="/dashboard/training" className="text-[12px] font-semibold text-accent">Training & EOD reports</Link>}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Trainee</th>
                    <th className="py-2 pr-3 font-semibold">Day card</th>
                    <th className="py-2 pr-3 font-semibold text-right">Approval</th>
                    <th className="py-2 pr-3 font-semibold text-right">Waiting</th>
                    <th className="py-2 pr-3 font-semibold">EOD today</th>
                    <th className="py-2 pr-3 font-semibold">Confidence</th>
                    <th className="py-2 font-semibold">Last blocker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {home.team.map((t) => (
                    <tr key={t._id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold">{t.fullName}</p>
                        <p className="text-[11px] text-muted">{t.track}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-[12px]">{t.progress ? <>Day {t.progress.day} · {t.progress.card.title}</> : '–'}</td>
                      <td className="py-2.5 pr-3 text-right tabular">
                        {t.drafts.approvalRate === null ? '–' : (
                          <span className={t.drafts.approvalRate < 0.6 ? 'text-critical font-semibold' : ''}>{pct(t.drafts.approvalRate)}</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular">{t.drafts.pending}</td>
                      <td className="py-2.5 pr-3">{t.eodToday ? <StatusBadge level="good">Posted</StatusBadge> : <StatusBadge level="pending">Not yet</StatusBadge>}</td>
                      <td className="py-2.5 pr-3"><ConfidenceTrend values={t.confidenceTrend} /></td>
                      <td className="py-2.5 text-[12px] text-ink-2 max-w-[260px]">{t.lastEod?.blocker || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </StateBlock>
  )
}

export default SeniorHome
