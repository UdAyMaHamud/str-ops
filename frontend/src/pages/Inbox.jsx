import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router'
import toast from 'react-hot-toast'
import { FiSend, FiAlertTriangle } from 'react-icons/fi'
import { useGetThreadsQuery, useGetDraftsQuery, useCreateDraftMutation, useReviewDraftMutation } from '../store/api/inboxApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatCard from '../components/common/StatCard'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { pct, timeAgo, minutesSince, fmtDateTime, label } from '../components/common/format'

// Message Timeline (workbook Day 4)
const STAGES = [
  ['booking', 'Booking'],
  ['pre_arrival', '3 days before'],
  ['check_in', 'Check-in day'],
  ['mid_stay', 'Mid-stay'],
  ['pre_checkout', 'Day before checkout'],
  ['post_checkout', 'After checkout'],
]

const DRAFT_LEVEL = { pending: 'pending', approved: 'good', edited: 'info', rejected: 'critical' }

const Inbox = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetThreadsQuery(property, { pollingInterval: 60000 })
  const { data: draftData } = useGetDraftsQuery(property)
  const [createDraft, { isLoading: saving }] = useCreateDraftMutation()
  // ?thread=<id> opens that conversation (links from the trainee and senior homes)
  const [searchParams] = useSearchParams()
  const [activeId, setActiveId] = useState(searchParams.get('thread'))
  const [draftText, setDraftText] = useState('')
  const [draftType, setDraftType] = useState('reply')

  const threads = data?.data || []
  const stats = data?.stats
  const drafts = draftData?.data || []
  const draftStats = draftData?.stats
  const active = threads.find((t) => t._id === activeId) || threads[0]
  const activeDrafts = drafts.filter((d) => d.thread === active?._id)

  useEffect(() => {
    setDraftText('')
  }, [activeId])

  // ====== Save draft (never sends)
  const handleSaveDraft = async (e) => {
    e.preventDefault()
    if (!draftText.trim()) return toast.error('Write the draft first', { position: 'top-center' })
    try {
      const res = await createDraft({ threadId: active._id, type: draftType, body: draftText }).unwrap()
      toast.success(res.message || 'Draft saved', { duration: 3000, position: 'top-center' })
      setDraftText('')
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <>
      <PageHeader
        title="Inbox & Drafts"
        subtitle="Unified inbox from the PMS. Draft, don't send: every reply is saved as a draft until a senior approves it."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Avg response time" value={stats ? `${stats.avgResponseMin} min` : '–'} sub="target under 60 min" />
        <StatCard title="Response rate" value={stats ? pct(stats.responseRate) : '–'} sub="affects Superhost + ranking" />
        <StatCard title="Waiting for reply" value={stats?.waiting ?? '–'} sub={stats?.oldestWaitingMin ? `oldest ${stats.oldestWaitingMin} min` : 'none waiting'} />
        <StatCard
          title="Draft approval rate"
          value={draftStats ? pct(draftStats.approvalRate) : '–'}
          sub={draftStats ? `${draftStats.pending} pending · ${pct(draftStats.cleanApprovalRate)} unedited` : ''}
        />
      </div>

      <StateBlock isLoading={isLoading} error={error} isEmpty={!threads.length} emptyText="No conversations for this property">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
          {/* ====== Thread list ====== */}
          <Panel title="Conversations" source="Hostaway unified inbox · webhook" rule="Worried if any guest waits over 60 minutes.">
            <ul className="-mx-2 space-y-1 max-h-[640px] overflow-y-auto">
              {threads.map((t) => {
                const last = t.messages[t.messages.length - 1]
                const wait = minutesSince(last?.sentAt)
                return (
                  <li key={t._id}>
                    <button
                      onClick={() => setActiveId(t._id)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 cursor-pointer ${active?._id === t._id ? 'bg-primary/5 ring-1 ring-primary/15' : 'hover:bg-page'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-medium truncate">
                          {t.property?.code} · <span className="font-mono text-[12px]">{t.reservationCode}</span>
                        </p>
                        <span className="text-[11px] text-muted whitespace-nowrap">{timeAgo(last?.sentAt)}</span>
                      </div>
                      <p className="text-[12px] text-ink-2 truncate mt-0.5">{last?.body}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.needsReply && <StatusBadge level={wait > 60 ? 'critical' : 'warning'}>{wait > 60 ? `Overdue ${wait} min` : `Waiting ${wait} min`}</StatusBadge>}
                        {t.escalate && <StatusBadge level="serious">Escalated</StatusBadge>}
                        <StatusBadge level="neutral">{STAGES.find((s) => s[0] === t.stage)?.[1] || label(t.stage)}</StatusBadge>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>

          {/* ====== Conversation + draft composer ====== */}
          {active && (
            <Panel
              title={`${active.property?.name} · ${active.reservationCode}`}
              source={`${active.channel} · property time zone ${active.property?.timezone}`}
              rule="Complaint formula: Acknowledge, Apologise, Act, give a Time frame, Follow up."
            >
              {/* Timeline position */}
              <ol className="flex flex-wrap gap-1 mb-4">
                {STAGES.map(([key, name]) => (
                  <li
                    key={key}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${
                      key === active.stage ? 'bg-primary text-white border-primary' : 'border-line text-muted'
                    }`}
                  >
                    {name}
                  </li>
                ))}
              </ol>

              {active.escalate && (
                <p className="mb-3 flex items-center gap-2 rounded-lg bg-serious/10 px-3 py-2 text-[12px] text-[#8a3a17]">
                  <FiAlertTriangle /> Escalated to: {active.escalateTo}
                </p>
              )}

              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {active.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === 'host' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] ${m.sender === 'host' ? 'bg-primary text-white rounded-br-sm' : 'bg-page rounded-bl-sm'}`}>
                      <p>{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.sender === 'host' ? 'text-white/60' : 'text-muted'}`}>
                        {m.sender === 'host' ? 'Host' : 'Guest'} · {fmtDateTime(m.sentAt, active.property?.timezone)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSaveDraft} className="mt-4 border-t border-line pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[12px] font-semibold">New draft</p>
                  <select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="h-7 rounded-md border border-line px-2 text-[12px] cursor-pointer">
                    <option value="reply">Reply</option>
                    <option value="task">Task</option>
                    <option value="update">Update</option>
                  </select>
                  <span className="ml-auto text-[11px] text-muted">{draftText.length} chars</span>
                </div>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={4}
                  placeholder="Write a warm, correct reply. Use the guest's first name, never personal data."
                  className="w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
                <button
                  disabled={saving}
                  className="mt-2 inline-flex items-center gap-2 bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-medium cursor-pointer active:scale-95 disabled:opacity-60"
                >
                  <FiSend size={14} /> {saving ? 'Saving...' : 'Save draft for approval'}
                </button>
              </form>

              {activeDrafts.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-2">Drafts on this conversation</h3>
                  <ul className="space-y-2">
                    {activeDrafts.map((d) => (
                      <DraftItem key={d._id} draft={d} isSenior={isSenior} />
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          )}
        </div>

        {/* ====== Draft log ====== */}
        <Panel title="Draft Log" source="Day 20 format" rule="Approval rate = approved + edited ÷ reviewed. Rewrite every rejected draft using the feedback." className="mt-5">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <th className="py-2 pr-3 font-semibold">Time</th>
                  <th className="py-2 pr-3 font-semibold">Reservation</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Result</th>
                  <th className="py-2 pr-3 font-semibold">Feedback</th>
                  <th className="py-2 font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {drafts.map((d) => (
                  <tr key={d._id}>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{timeAgo(d.createdAt)}</td>
                    <td className="py-2 pr-3 font-mono">{d.property?.code} · {d.reservationCode}</td>
                    <td className="py-2 pr-3 capitalize">{d.type}</td>
                    <td className="py-2 pr-3"><StatusBadge level={DRAFT_LEVEL[d.status]}>{label(d.status)}</StatusBadge></td>
                    <td className="py-2 pr-3 text-ink-2 max-w-[360px]">{d.feedback || '–'}</td>
                    <td className="py-2 text-ink-2 whitespace-nowrap">{d.author?.fullName}{d.reviewer ? ` → ${d.reviewer.fullName}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </StateBlock>
    </>
  )
}

// ====== One draft with senior review controls
const DraftItem = ({ draft, isSenior }) => {
  const [reviewDraft, { isLoading }] = useReviewDraftMutation()
  const [mode, setMode] = useState('')
  const [text, setText] = useState(draft.body)

  const handleReview = async (status) => {
    if (status === 'rejected' && !text.trim()) return toast.error('Write feedback for the trainee', { position: 'top-center' })
    try {
      const body = status === 'edited' ? { status, finalBody: text } : status === 'rejected' ? { status, feedback: text } : { status }
      const res = await reviewDraft({ id: draft._id, ...body }).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setMode('')
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <StatusBadge level={DRAFT_LEVEL[draft.status]}>{label(draft.status)}</StatusBadge>
          <span className="text-[11px] text-muted capitalize">{draft.type} · {draft.author?.fullName} · {timeAgo(draft.createdAt)}</span>
        </div>
      </div>
      <p className="text-[13px] whitespace-pre-line">{draft.finalBody || draft.body}</p>
      {draft.feedback && <p className="mt-1.5 text-[12px] text-ink-2"><span className="font-semibold">Feedback:</span> {draft.feedback}</p>}

      {draft.status === 'pending' && (
        isSenior ? (
          <div className="mt-2.5">
            {mode && (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                placeholder={mode === 'rejected' ? 'Feedback for the trainee' : ''}
                className="w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-accent mb-2"
              />
            )}
            <div className="flex flex-wrap gap-2">
              {!mode && (
                <>
                  <button disabled={isLoading} onClick={() => handleReview('approved')} className="rounded-lg bg-good text-white px-3 py-1.5 text-[12px] font-medium cursor-pointer active:scale-95">Approve & send</button>
                  <button onClick={() => { setMode('edited'); setText(draft.body) }} className="rounded-lg border border-line px-3 py-1.5 text-[12px] cursor-pointer active:scale-95">Edit</button>
                  <button onClick={() => { setMode('rejected'); setText('') }} className="rounded-lg border border-critical/40 text-critical px-3 py-1.5 text-[12px] cursor-pointer active:scale-95">Reject</button>
                </>
              )}
              {mode && (
                <>
                  <button disabled={isLoading} onClick={() => handleReview(mode)} className="rounded-lg bg-primary text-white px-3 py-1.5 text-[12px] font-medium cursor-pointer active:scale-95">
                    {mode === 'edited' ? 'Save edit & send' : 'Reject with feedback'}
                  </button>
                  <button onClick={() => setMode('')} className="rounded-lg border border-line px-3 py-1.5 text-[12px] cursor-pointer">Cancel</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted">Waiting for a senior to review.</p>
        )
      )}
    </li>
  )
}

export default Inbox
