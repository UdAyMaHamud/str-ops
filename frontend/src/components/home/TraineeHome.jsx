import React, { useState } from 'react'
import { Link } from 'react-router'
import {
  FiEdit3, FiClock, FiLogIn, FiLogOut, FiRefreshCw, FiBell, FiAlertTriangle, FiShield, FiCheckCircle, FiFileText, FiHelpCircle,
} from 'react-icons/fi'
import { useGetTraineeHomeQuery } from '../../store/api/homeApi'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import StateBlock from '../common/StateBlock'
import HomeHero, { HeroStat } from './HomeHero'
import DayProgress from './DayProgress'
import EodForm from './EodForm'
import { pct, timeAgo, label } from '../common/format'

const STAGES = { booking: 'Booking', pre_arrival: '3 days before', check_in: 'Check-in day', mid_stay: 'Mid-stay', pre_checkout: 'Day before checkout', post_checkout: 'After checkout' }
const DRAFT_LEVEL = { pending: 'pending', approved: 'good', edited: 'info', rejected: 'critical' }

// Security rules you signed (workbook Section 06), short form
const RULES = [
  'Keys live in one place only. Never in chat, sheets or prompts.',
  'Guest data stays in the source tool. Use reservation codes.',
  'Draft, don\'t send. A senior approves every live message.',
  'Something broke? Stop, capture the error, escalate within 15 min.',
]

const TraineeHome = () => {
  const { data, isLoading, error } = useGetTraineeHomeQuery(undefined, { pollingInterval: 60000 })
  const [editingEod, setEditingEod] = useState(false)
  const home = data?.data
  const progress = home?.progress

  return (
    <StateBlock isLoading={isLoading} error={error}>
      {home && (
        <div className="space-y-5">
          {/* ====== Day Card hero ====== */}
          {progress ? (
            <HomeHero
              eyebrow={`Week ${progress.week} · ${progress.weekName}${progress.isDayOff ? ' · Today is your day off' : ''}`}
              title={<>Day {progress.day} of {progress.totalDays}: {progress.card.title}</>}
              aside={
                <div className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2.5">
                  <HeroStat label="Draft approval" value={home.drafts.approvalRate === null ? '–' : pct(home.drafts.approvalRate)} sub="approved + edited" />
                  <HeroStat label="EOD reports" value={`${home.eod.count}`} sub={home.eod.submittedToday ? 'today posted' : 'today missing'} />
                  <HeroStat
                    label="Next checkpoint"
                    value={progress.nextCheckpoint ? (progress.nextCheckpoint.inDays === 0 ? 'Today' : `${progress.nextCheckpoint.inDays} day${progress.nextCheckpoint.inDays > 1 ? 's' : ''}`) : '–'}
                    sub={progress.nextCheckpoint ? `Day ${progress.nextCheckpoint.day}` : 'all done'}
                  />
                </div>
              }
            >
              <p className="mt-2 text-[14px] text-white/80 max-w-2xl">{progress.card.goal}</p>
              <div className="mt-4 max-w-2xl"><DayProgress day={progress.day} dark /></div>
              <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><FiFileText size={12} /> Submit <span className="font-mono">{progress.card.fileName}</span></span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5"><FiHelpCircle size={12} /> {progress.card.selfCheck}</span>
                {progress.usHours && <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/90 text-ink px-3 py-1.5 font-semibold"><FiClock size={12} /> Week 4: US hours shift</span>}
              </div>
            </HomeHero>
          ) : (
            <HomeHero eyebrow="Trainee" title="Your training start date isn't set yet">
              <p className="mt-2 text-[13px] text-white/70">Ask an admin to set it. Your Day Card appears here once it is.</p>
            </HomeHero>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-5 items-start">
            {/* ====== Shift queue ====== */}
            <Panel title="Your shift queue" source="Guests waiting with no draft in review yet" rule="Response-time standard: under 60 minutes. Oldest first.">
              {home.shiftQueue.length === 0 ? (
                <div className="py-6 text-center"><StatusBadge level="good">Inbox clear</StatusBadge></div>
              ) : (
                <ul className="divide-y divide-line/70">
                  {home.shiftQueue.map((t) => (
                    <li key={t._id} className="flex items-start gap-3 py-3">
                      <StatusBadge level={t.waitMin > 60 ? 'critical' : 'warning'}>{t.waitMin} min</StatusBadge>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold">
                          {t.property?.code} · <span className="font-mono text-[12px]">{t.reservationCode}</span>
                          <span className="ml-2 text-[11px] font-normal text-muted">{STAGES[t.stage] || label(t.stage)}</span>
                          {t.escalate && <span className="ml-2"><StatusBadge level="serious">Escalated</StatusBadge></span>}
                        </p>
                        <p className="text-[12px] text-ink-2 line-clamp-2">“{t.lastMessage}”</p>
                      </div>
                      <Link to={`/dashboard/inbox?thread=${t._id}`} className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary text-white px-3.5 py-2 text-[12px] font-semibold active:scale-95">
                        <FiEdit3 size={12} /> Draft reply
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ====== My drafts ====== */}
            <Panel
              title="My drafts"
              source="Day 20 Draft Log"
              rule="Rewrite every rejected draft using the senior's feedback."
              action={<Link to="/dashboard/inbox" className="text-[12px] font-semibold text-accent">Draft Log</Link>}
            >
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  ['Waiting', home.drafts.pending, 'text-ink'],
                  ['Approved', home.drafts.approved, 'text-good-text'],
                  ['Edited', home.drafts.edited, 'text-[#2f6fa8]'],
                  ['Rejected', home.drafts.rejected, 'text-critical'],
                ].map(([name, value, color]) => (
                  <div key={name} className="rounded-2xl bg-mint px-2 py-2 text-center">
                    <p className={`text-[20px] font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted">{name}</p>
                  </div>
                ))}
              </div>
              {home.drafts.needsRewrite.length > 0 && (
                <div className="mb-4 space-y-2">
                  {home.drafts.needsRewrite.map((d) => (
                    <div key={d._id} className="rounded-2xl border border-critical/25 bg-critical/5 p-3">
                      <p className="text-[12px] font-semibold text-critical">Rewrite needed · {d.property?.code} · <span className="font-mono">{d.reservationCode}</span></p>
                      <p className="text-[12px] text-ink-2 mt-1 line-through decoration-critical/40">{d.body}</p>
                      <p className="text-[12px] mt-1"><span className="font-semibold">{d.reviewer?.fullName || 'Senior'}:</span> {d.feedback}</p>
                      <Link to={`/dashboard/inbox?thread=${d.thread}`} className="mt-2 inline-block text-[12px] font-semibold text-accent">Rewrite now →</Link>
                    </div>
                  ))}
                </div>
              )}
              <ul className="space-y-2">
                {home.drafts.recent.map((d) => (
                  <li key={d._id} className="flex items-start gap-2 text-[12px]">
                    <StatusBadge level={DRAFT_LEVEL[d.status]}>{label(d.status)}</StatusBadge>
                    <span className="min-w-0 flex-1 truncate text-ink-2">{d.body}</span>
                    <span className="text-muted whitespace-nowrap">{timeAgo(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1.35fr_1fr] gap-5 items-start">
            {/* ====== EOD report ====== */}
            <Panel
              title="End-of-Day report"
              source="Post before you leave · #training"
              rule="No EOD report means the day is not counted, even if you did the work."
              action={home.eod.submittedToday && !editingEod && <StatusBadge level="good">Posted</StatusBadge>}
            >
              {home.eod.submittedToday && !editingEod ? (
                <div className="text-[13px] space-y-1.5">
                  <p><span className="text-muted">Tasks:</span> {home.eod.today.tasks}</p>
                  <p><span className="text-muted">Learned:</span> {home.eod.today.learned.join(' · ')}</p>
                  {home.eod.today.blocker && <p><span className="text-muted">Blocker:</span> {home.eod.today.blocker}</p>}
                  <p><span className="text-muted">Confidence:</span> {home.eod.today.confidence}/5</p>
                  {home.eod.today.reviewNote && <p className="rounded-xl bg-mint px-3 py-2"><span className="font-semibold">Trainer:</span> {home.eod.today.reviewNote}</p>}
                  <button onClick={() => setEditingEod(true)} className="text-[12px] font-semibold text-accent cursor-pointer">Edit today's report</button>
                </div>
              ) : (
                <EodForm initial={editingEod ? home.eod.today : null} defaultSubmitted={progress?.card.fileName || ''} onDone={() => setEditingEod(false)} />
              )}
            </Panel>

            <div className="space-y-5">
              {/* ====== Today on the floor (read-only) ====== */}
              <Panel title="Today on the floor" source="Read-only for trainees">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ['Check-ins', home.today.checkIns, FiLogIn, '/dashboard/turnovers'],
                    ['Check-outs', home.today.checkOuts, FiLogOut, '/dashboard/turnovers'],
                    ['Turnovers', home.today.turnovers, FiRefreshCw, '/dashboard/turnovers'],
                    ['Open alerts', home.today.openAlerts, FiBell, '/dashboard/smart-home'],
                  ].map(([name, value, Icon, to]) => (
                    <Link key={name} to={to} className="rounded-2xl bg-mint px-3 py-2.5 flex items-center gap-3 hover:ring-1 hover:ring-accent/30">
                      <Icon className="text-accent" size={16} />
                      <div>
                        <p className="text-[18px] font-bold leading-none">{value}</p>
                        <p className="text-[11px] text-ink-2 mt-1">{name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Panel>

              {/* ====== Help + escalations ====== */}
              <Panel title="Stuck or something broke?" source="20-minute rule">
                <p className="text-[12px] text-ink-2">Stuck for 20 minutes? Ask. Being stuck silently is the only real mistake.</p>
                <Link to="/dashboard/escalations" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[12px] font-semibold hover:bg-mint">
                  <FiAlertTriangle size={12} /> Raise an escalation
                </Link>
                {home.myEscalations.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {home.myEscalations.map((e) => (
                      <li key={e._id} className="flex items-start gap-2 text-[12px]">
                        <StatusBadge level={e.status === 'resolved' ? 'good' : 'pending'}>{label(e.status)}</StatusBadge>
                        <span className="min-w-0 flex-1 text-ink-2 line-clamp-2">{e.property?.code} · {e.whatHappened}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Rules you signed" source="Section 06">
                <ul className="space-y-2">
                  {RULES.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-[12px] text-ink-2">
                      <FiShield className="mt-0.5 text-accent shrink-0" size={12} /> {r}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><FiCheckCircle size={11} /> Reporting your own mistake fast always counts in your favour.</p>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </StateBlock>
  )
}

export default TraineeHome
