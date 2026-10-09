import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { useGetContactsQuery, useGetEscalationsQuery, useCreateEscalationMutation, useResolveEscalationMutation } from '../store/api/systemApi'
import { useGetPropertiesQuery } from '../store/api/overviewApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { timeAgo, label } from '../components/common/format'

const URGENCY = { now: ['critical', 'Now'], within_1_hr: ['serious', 'Within 1 hr'], today: ['warning', 'Today'] }
const NEEDS = { decision: 'Decision', approval: 'Approval', access: 'Access', call_vendor: 'Call vendor' }
const EMPTY_FORM = { urgency: 'within_1_hr', property: '', reservationCode: '', whatHappened: '', alreadyDid: '', need: 'decision', suggestion: '' }

const Escalations = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data: contactData } = useGetContactsQuery()
  const { data, isLoading, error } = useGetEscalationsQuery(property)
  const { data: propertyData } = useGetPropertiesQuery()
  const [createEscalation, { isLoading: sending }] = useCreateEscalationMutation()
  const [resolveEscalation] = useResolveEscalationMutation()
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState('')
  const contacts = contactData?.data || []
  const escalations = data?.data || []
  const properties = propertyData?.data || []

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors('')
  }

  // ====== Submit Escalation Report
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.property) return setErrors('Pick the property.')
    if (!formData.whatHappened.trim()) return setErrors('Describe what happened.')
    try {
      const res = await createEscalation(formData).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setFormData(EMPTY_FORM)
    } catch (err) {
      setErrors(err?.data?.message || err?.message || 'Something went wrong')
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

  const inputCls = 'w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-accent'

  return (
    <>
      <PageHeader title="Escalations" subtitle="Who to contact for each problem, and the Escalation Report format. Never include a guest's full name or phone number." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-start">
        <div className="space-y-5">
          <Panel title="Escalation list" source="Day 15" rule="Stuck for 20 minutes? Ask. Something broken? Escalate within 15 minutes.">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Problem</th>
                    <th className="py-2 pr-3 font-semibold">Contact</th>
                    <th className="py-2 pr-3 font-semibold">Channel</th>
                    <th className="py-2 font-semibold">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line align-top">
                  {contacts.map((c) => (
                    <tr key={c._id}>
                      <td className="py-2 pr-3 font-medium">{c.problemType}{c.notes && <p className="text-[11px] font-normal text-muted">{c.notes}</p>}</td>
                      <td className="py-2 pr-3">{c.contact}</td>
                      <td className="py-2 pr-3 text-ink-2">{c.channel}</td>
                      <td className="py-2"><StatusBadge level={URGENCY[c.urgency][0]}>{URGENCY[c.urgency][1]}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Escalation reports" source="Ops channel">
            <StateBlock isLoading={isLoading} error={error} isEmpty={!escalations.length} emptyText="No escalations">
              <ul className="divide-y divide-line">
                {escalations.map((e) => (
                  <li key={e._id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge level={URGENCY[e.urgency][0]}>{URGENCY[e.urgency][1]}</StatusBadge>
                      <StatusBadge level={e.status === 'resolved' ? 'good' : 'pending'}>{label(e.status)}</StatusBadge>
                      <span className="text-[12px] font-medium">{e.property?.code} · {e.property?.name}</span>
                      {e.reservationCode && <span className="text-[11px] font-mono text-muted">{e.reservationCode}</span>}
                      <span className="text-[11px] text-muted">· {e.createdBy?.fullName} · {timeAgo(e.createdAt)}</span>
                    </div>
                    <dl className="mt-1.5 grid sm:grid-cols-[130px_1fr] gap-x-3 gap-y-0.5 text-[12px]">
                      <dt className="text-muted">What happened</dt><dd>{e.whatHappened}</dd>
                      <dt className="text-muted">Already did</dt><dd>{e.alreadyDid || '–'}</dd>
                      <dt className="text-muted">Need</dt><dd>{NEEDS[e.need]}</dd>
                      <dt className="text-muted">Suggested</dt><dd>{e.suggestion || '–'}</dd>
                    </dl>
                    {isSenior && e.status === 'open' && (
                      <button onClick={() => handleResolve(e._id)} className="mt-2 rounded-lg bg-good text-white px-3 py-1 text-[12px] cursor-pointer active:scale-95">Mark resolved</button>
                    )}
                  </li>
                ))}
              </ul>
            </StateBlock>
          </Panel>
        </div>

        {/* ====== New escalation form ====== */}
        <Panel title="New Escalation Report" source="Section 03 format" className="xl:sticky xl:top-24">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {errors && <p className="bg-amber-300 rounded-md py-2 text-center text-red-600 text-[12px] font-medium">{errors}</p>}
            <div className="grid grid-cols-2 gap-2">
              <select name="urgency" value={formData.urgency} onChange={handleChange} className={`${inputCls} cursor-pointer`}>
                {Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>Urgency: {v[1]}</option>)}
              </select>
              <select name="need" value={formData.need} onChange={handleChange} className={`${inputCls} cursor-pointer`}>
                {Object.entries(NEEDS).map(([k, v]) => <option key={k} value={k}>Need: {v}</option>)}
              </select>
            </div>
            <select name="property" value={formData.property} onChange={handleChange} className={`${inputCls} cursor-pointer`}>
              <option value="">Property…</option>
              {properties.map((p) => <option key={p._id} value={p._id}>{p.code} · {p.name}</option>)}
            </select>
            <input name="reservationCode" value={formData.reservationCode} onChange={handleChange} placeholder="Reservation code (never the guest's name or phone)" className={inputCls} />
            <textarea name="whatHappened" value={formData.whatHappened} onChange={handleChange} rows={3} placeholder="What happened" className={inputCls} />
            <textarea name="alreadyDid" value={formData.alreadyDid} onChange={handleChange} rows={2} placeholder="What I already did" className={inputCls} />
            <textarea name="suggestion" value={formData.suggestion} onChange={handleChange} rows={2} placeholder="My suggested solution" className={inputCls} />
            <button disabled={sending} className="w-full bg-primary text-white rounded-lg py-2 text-[13px] font-medium cursor-pointer active:scale-95 disabled:opacity-60">
              {sending ? 'Sending...' : 'Send escalation'}
            </button>
          </form>
        </Panel>
      </div>
    </>
  )
}

export default Escalations
