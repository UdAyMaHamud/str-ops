import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiShield } from 'react-icons/fi'
import { useGetScreeningsQuery, useUpdateScreeningMutation } from '../store/api/riskApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { fmtDate, label } from '../components/common/format'

const DECISION_LEVEL = { pending: 'pending', approve: 'good', investigate: 'warning', decline: 'critical' }
const DECISION_TEXT = { pending: 'Pending', approve: 'Approve', investigate: 'Investigate', decline: 'Recommend decline' }

const Screening = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetScreeningsQuery(property)
  const screenings = data?.data || []

  return (
    <>
      <PageHeader title="Screening" subtitle="Screening Decision Log (Day 9). A risk score is a signal, not a decision: every Investigate or Decline needs a real one-line reason for the owner." />

      <p className="mb-4 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-2.5 text-[12px] text-primary">
        <FiShield /> Never download or screenshot a guest's ID. Refer to guests by reservation code only.
      </p>

      <StateBlock isLoading={isLoading} error={error} isEmpty={!screenings.length} emptyText="No upcoming bookings to screen">
        <Panel title="Upcoming bookings" source="Screening tool · polling every 30 min" rule="Worried if a booking arriving within 7 days is still Pending or Investigate, or ID check is incomplete 48 h before check-in.">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <th className="py-2 pr-3 font-semibold">Res. code</th>
                  <th className="py-2 pr-3 font-semibold">Check-in</th>
                  <th className="py-2 pr-3 font-semibold">Risk score</th>
                  <th className="py-2 pr-3 font-semibold">Flags seen</th>
                  <th className="py-2 pr-3 font-semibold">ID</th>
                  <th className="py-2 pr-3 font-semibold">Decision</th>
                  <th className="py-2 font-semibold">Reason to owner / follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line align-top">
                {screenings.map((s) => <ScreeningRow key={s._id} screening={s} isSenior={isSenior} />)}
              </tbody>
            </table>
          </div>
        </Panel>
      </StateBlock>
    </>
  )
}

const ScreeningRow = ({ screening: s, isSenior }) => {
  const [updateScreening, { isLoading }] = useUpdateScreeningMutation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ decision: s.decision === 'pending' ? 'investigate' : s.decision, reason: s.reason, followUp: s.followUp })

  const handleSave = async () => {
    if (form.decision !== 'approve' && form.reason.trim().length < 10)
      return toast.error('Write a real reason, not just the score', { position: 'top-center' })
    try {
      const res = await updateScreening({ id: s._id, ...form }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
      setEditing(false)
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  const scoreColor = s.riskScore >= 70 ? 'bg-critical' : s.riskScore >= 40 ? 'bg-warning' : 'bg-good'

  return (
    <tr>
      <td className="py-2.5 pr-3">
        <p className="font-mono">{s.reservationCode}</p>
        <p className="text-[11px] text-muted">{s.property?.code} · {s.property?.name}</p>
      </td>
      <td className="py-2.5 pr-3 whitespace-nowrap">{fmtDate(s.checkIn)}</td>
      <td className="py-2.5 pr-3 w-28">
        <p className="font-semibold tabular">{s.riskScore}</p>
        <div className="h-1.5 rounded-full bg-page mt-1"><div className={`h-1.5 rounded-full ${scoreColor}`} style={{ width: `${s.riskScore}%` }} /></div>
      </td>
      <td className="py-2.5 pr-3 max-w-[280px]">
        <ul className="list-disc pl-4 text-ink-2">{s.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
      </td>
      <td className="py-2.5 pr-3">{s.idVerified ? <StatusBadge level="good">Verified</StatusBadge> : <StatusBadge level="warning">Not done</StatusBadge>}</td>
      <td className="py-2.5 pr-3"><StatusBadge level={DECISION_LEVEL[s.decision]}>{DECISION_TEXT[s.decision]}</StatusBadge></td>
      <td className="py-2.5 min-w-[260px]">
        {!editing ? (
          <>
            <p>{s.reason || <span className="text-muted">No decision yet</span>}</p>
            {s.followUp && <p className="text-[11px] text-ink-2 mt-0.5">Follow-up: {s.followUp}</p>}
            {isSenior && <button onClick={() => setEditing(true)} className="mt-1 text-[12px] text-accent cursor-pointer">Decide</button>}
          </>
        ) : (
          <div className="space-y-1.5">
            <select value={form.decision} onChange={(e) => setForm((p) => ({ ...p, decision: e.target.value }))} className="w-full h-8 rounded-lg border border-line px-2 cursor-pointer">
              {['approve', 'investigate', 'decline'].map((d) => <option key={d} value={d}>{DECISION_TEXT[d]}</option>)}
            </select>
            <input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="One-line reason for the owner" className="w-full rounded-lg border border-line px-2 py-1.5 outline-none focus:border-accent" />
            <input value={form.followUp} onChange={(e) => setForm((p) => ({ ...p, followUp: e.target.value }))} placeholder="Follow-up (optional)" className="w-full rounded-lg border border-line px-2 py-1.5 outline-none focus:border-accent" />
            <div className="flex gap-2">
              <button disabled={isLoading} onClick={handleSave} className="rounded-lg bg-primary text-white px-3 py-1 cursor-pointer active:scale-95">Save</button>
              <button onClick={() => setEditing(false)} className="rounded-lg border border-line px-3 py-1 cursor-pointer">{label('cancel')}</button>
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export default Screening
