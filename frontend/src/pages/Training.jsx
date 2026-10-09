import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiCheck, FiFlag } from 'react-icons/fi'
import { useGetTrainingQuery, useGetEodsQuery, useReviewEodMutation, useGetTeamQuery } from '../store/api/trainingApi'
import { selectCurrentUser } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import DayProgress from '../components/home/DayProgress'
import { pct, fmtDate } from '../components/common/format'

const WEEKS = ['STR Foundations and Guest Ops', 'Revenue, Risk and Reporting', 'Our Stack', 'Live Ops and Capstone']

const Training = () => {
  const user = useSelector(selectCurrentUser)
  const isTrainer = ['senior', 'admin'].includes(user?.role)
  const [selected, setSelected] = useState('')
  const { data: teamData } = useGetTeamQuery(undefined, { skip: !isTrainer })
  const team = teamData?.data || []
  const traineeId = isTrainer ? selected || team[0]?._id : undefined
  const { data, isLoading, error } = useGetTrainingQuery(traineeId, { skip: isTrainer && !traineeId })
  const { data: eodData } = useGetEodsQuery(isTrainer ? selected || undefined : undefined)
  const training = data?.data
  const progress = training?.progress
  const eods = eodData?.data || []

  return (
    <>
      <PageHeader
        title={isTrainer ? 'Training & EOD reports' : 'My training'}
        subtitle={isTrainer ? 'Where each trainee is in the 30-day academy, and their End-of-Day reports. Leave feedback on each report.' : 'Your 24 Day Cards and every End-of-Day report you posted, with trainer feedback.'}
      >
        {isTrainer && team.length > 0 && (
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-10 rounded-full border border-line bg-white px-4 text-[13px] cursor-pointer"
            aria-label="Trainee"
          >
            <option value="">All trainees</option>
            {team.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
          </select>
        )}
      </PageHeader>

      {isTrainer && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-5">
          {team.map((t) => (
            <button
              key={t._id}
              onClick={() => setSelected(t._id)}
              className={`text-left rounded-3xl bg-white border p-4 cursor-pointer ${traineeId === t._id ? 'border-accent ring-2 ring-accent/15' : 'border-line/70'}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold">{t.fullName}</p>
                {t.eodToday ? <StatusBadge level="good">EOD posted</StatusBadge> : <StatusBadge level="pending">No EOD yet</StatusBadge>}
              </div>
              <p className="text-[11px] text-muted mb-3">{t.track}</p>
              {t.progress && <DayProgress day={t.progress.day} />}
              <p className="mt-2 text-[12px]">Day {t.progress?.day} · {t.progress?.card.title}</p>
              <p className="text-[12px] text-ink-2">Approval {t.drafts.approvalRate === null ? '–' : pct(t.drafts.approvalRate)} · {t.drafts.pending} waiting · {t.drafts.rejected} rejected</p>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-5 items-start">
        {/* ====== Day cards ====== */}
        <StateBlock isLoading={isLoading} error={error}>
          {training && (
            <Panel
              title={isTrainer ? `${training.trainee.fullName}: Day Cards` : 'Day Cards'}
              source="Workbook Section 04"
              rule="Read each card the evening before. Checkpoints are scored."
            >
              {progress && <div className="mb-5"><DayProgress day={progress.day} /></div>}
              <div className="space-y-5">
                {WEEKS.map((week, w) => (
                  <div key={week}>
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Week {w + 1} · {week}</h3>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {training.plan.slice(w * 6, w * 6 + 6).map((c) => {
                        const state = !progress ? 'next' : c.day < progress.day ? 'done' : c.day === progress.day ? 'today' : 'next'
                        return (
                          <li
                            key={c.day}
                            title={c.goal}
                            className={`rounded-2xl px-3 py-2.5 border ${state === 'today' ? 'border-primary bg-primary text-white' : state === 'done' ? 'border-line/70 bg-mint' : 'border-line/70 bg-white'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-6 w-6 rounded-lg text-[11px] font-bold flex items-center justify-center ${state === 'today' ? 'bg-white text-primary' : state === 'done' ? 'bg-accent text-white' : 'bg-mint text-muted'}`}>
                                {state === 'done' ? <FiCheck size={12} /> : c.day}
                              </span>
                              <span className="min-w-0 flex-1 text-[12px] font-semibold truncate">{c.title}</span>
                              {c.checkpoint && <FiFlag size={12} className={state === 'today' ? 'text-warning' : 'text-serious'} title="Checkpoint" />}
                            </div>
                            <p className={`mt-1 text-[11px] font-mono truncate ${state === 'today' ? 'text-white/70' : 'text-muted'}`}>D{String(c.day).padStart(2, '0')}_{(training.trainee.fullName || 'Name').split(' ')[0]}_{c.file}</p>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </StateBlock>

        {/* ====== EOD reports ====== */}
        <Panel title="End-of-Day reports" source="Section 03 format" rule={isTrainer ? 'Reply to every blocker and question before the next shift.' : 'Trainer feedback appears under each report.'}>
          {eods.length === 0 ? (
            <p className="text-[13px] text-muted py-4">No reports yet.</p>
          ) : (
            <ul className="space-y-3">
              {eods.map((e) => <EodItem key={e._id} eod={e} isTrainer={isTrainer} />)}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

// ====== One EOD report, with trainer feedback
const EodItem = ({ eod: e, isTrainer }) => {
  const [note, setNote] = useState('')
  const [reviewEod, { isLoading }] = useReviewEodMutation()

  const handleReview = async () => {
    if (!note.trim()) return toast.error('Write a short note first', { position: 'top-center' })
    try {
      const res = await reviewEod({ id: e._id, note }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
      setNote('')
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <li className="rounded-2xl border border-line/70 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold">EOD · Day {e.day}</span>
        {isTrainer && <span className="text-[12px] font-semibold text-accent">{e.user?.fullName}</span>}
        <span className="text-[11px] text-muted">{fmtDate(e.date)} · {e.hoursWorked} h</span>
        <span className="ml-auto"><StatusBadge level={e.confidence <= 2 ? 'serious' : e.confidence >= 4 ? 'good' : 'neutral'}>Confidence {e.confidence}/5</StatusBadge></span>
      </div>
      <dl className="mt-2 grid grid-cols-[96px_1fr] gap-x-2 gap-y-0.5 text-[12px]">
        <dt className="text-muted">Tasks</dt><dd>{e.tasks}</dd>
        {e.submitted && (<><dt className="text-muted">Submitted</dt><dd className="font-mono text-[11px]">{e.submitted}</dd></>)}
        <dt className="text-muted">Learned</dt><dd>{e.learned.join(' · ')}</dd>
        {e.blocker && (<><dt className="text-muted">Blocker</dt><dd className="text-critical">{e.blocker}</dd></>)}
        {e.question && (<><dt className="text-muted">Question</dt><dd>{e.question}</dd></>)}
        <dt className="text-muted">Next card read</dt><dd>{e.tomorrowCardRead ? 'Yes' : 'No'}</dd>
      </dl>
      {e.reviewNote && (
        <p className="mt-2 rounded-xl bg-mint px-3 py-2 text-[12px]"><span className="font-semibold">{e.reviewedBy?.fullName || 'Trainer'}:</span> {e.reviewNote}</p>
      )}
      {isTrainer && !e.reviewNote && (
        <div className="mt-2 flex gap-2">
          <input
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="Feedback or answer to the question"
            className="flex-1 min-w-0 rounded-xl border border-line px-3 py-2 text-[12px] outline-none focus:border-accent"
          />
          <button disabled={isLoading} onClick={handleReview} className="rounded-xl bg-primary text-white px-3 text-[12px] font-semibold cursor-pointer active:scale-95">Send</button>
        </div>
      )}
    </li>
  )
}

export default Training
