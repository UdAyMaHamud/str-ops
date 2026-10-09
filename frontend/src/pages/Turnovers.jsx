import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiCheck, FiX, FiMinus } from 'react-icons/fi'
import { useGetTurnoversQuery, useUpdateTurnoverQcMutation } from '../store/api/opsApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { fmtDateTime, label } from '../components/common/format'

// Photo QC Checklist (Section 05 C)
const QC_GUIDE = {
  Bedrooms: 'Beds made tight, fresh linen, nothing under beds, bins empty',
  Bathroom: 'Toilet, sink and shower clean, no hair, fresh towels, toiletries stocked',
  Kitchen: 'Counters clear, dishes away, fridge empty and clean, bins empty',
  Living: 'Cushions set, floors clean, remote and welcome items in place',
  Supplies: 'Toilet paper, soap, coffee, trash bags at agreed levels',
  Damage: 'Anything broken, stained or missing photographed close and reported',
}

const Turnovers = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetTurnoversQuery(property)
  const turnovers = data?.data || []

  return (
    <>
      <PageHeader title="Turnovers" subtitle="Cleaning between guests: schedule, photo QC and supply levels for the last 7 days and next 3 days." />

      <StateBlock isLoading={isLoading} error={error} isEmpty={!turnovers.length} emptyText="No turnovers in this window">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {turnovers.map((t) => (
              <TurnoverCard key={t._id} turnover={t} isSenior={isSenior} />
            ))}
          </div>

          <Panel title="Photo QC checklist" source="Workbook Section 05 C" rule="Reject with a reason. Never approve a bathroom you can't see clearly." className="xl:sticky xl:top-24">
            <dl className="space-y-2.5">
              {Object.entries(QC_GUIDE).map(([area, text]) => (
                <div key={area}>
                  <dt className="text-[12px] font-semibold">{area}</dt>
                  <dd className="text-[12px] text-ink-2">{text}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </StateBlock>
    </>
  )
}

const TurnoverCard = ({ turnover: t, isSenior }) => {
  const [updateQc, { isLoading }] = useUpdateTurnoverQcMutation()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const lowSupplies = t.supplies.filter((s) => s.level < s.par)

  const handleQc = async (qcStatus) => {
    try {
      const res = await updateQc({ id: t._id, qcStatus, qcReason: reason }).unwrap()
      toast.success(res.message, { duration: 3000, position: 'top-center' })
      setRejecting(false)
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <Panel
      title={`${t.property?.code} · ${t.property?.name}`}
      source={`${fmtDateTime(t.scheduledFor, t.property?.timezone)} local · ${t.cleaner}`}
      action={<StatusBadge level={t.status === 'done' ? 'good' : t.status === 'in_progress' ? 'info' : 'pending'}>{label(t.status)}</StatusBadge>}
    >
      <p className="text-[12px] text-ink-2 mb-3">
        Out: <span className="font-mono">{t.reservationCode}</span>
        {t.nextReservationCode && <> → In: <span className="font-mono">{t.nextReservationCode}</span></>}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
        {t.photoQc.map((a) => (
          <div
            key={a.area}
            title={a.note || QC_GUIDE[a.area]}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] ${
              a.pass === true ? 'bg-good/10 text-good-text' : a.pass === false ? 'bg-critical/10 text-critical' : 'bg-page text-muted'
            }`}
          >
            {a.pass === true ? <FiCheck size={12} /> : a.pass === false ? <FiX size={12} /> : <FiMinus size={12} />}
            {a.area}
          </div>
        ))}
      </div>
      {t.photoQc.filter((a) => a.note).map((a) => (
        <p key={a.area} className="text-[12px] text-critical mb-1">• {a.area}: {a.note}</p>
      ))}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <StatusBadge level={t.qcStatus === 'approved' ? 'good' : t.qcStatus === 'rejected' ? 'critical' : 'pending'}>QC {t.qcStatus}</StatusBadge>
        {lowSupplies.length > 0 && <StatusBadge level="warning">Low: {lowSupplies.map((s) => s.item).join(', ')}</StatusBadge>}
      </div>
      {t.qcReason && <p className="mt-2 text-[12px] text-ink-2">{t.qcReason}</p>}

      <details className="mt-3">
        <summary className="text-[12px] text-accent cursor-pointer">Supply levels</summary>
        <ul className="mt-2 space-y-1">
          {t.supplies.map((s) => (
            <li key={s.item} className="flex justify-between text-[12px]">
              <span>{s.item}</span>
              <span className={s.level < s.par ? 'text-critical font-semibold' : 'text-ink-2'}>{s.level} / par {s.par}</span>
            </li>
          ))}
        </ul>
      </details>

      {t.status === 'done' && t.qcStatus === 'pending' && (
        isSenior ? (
          <div className="mt-3 border-t border-line pt-3">
            {rejecting && (
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason, e.g. hair in shower (photo 7)"
                className="w-full rounded-lg border border-line px-3 py-2 text-[13px] outline-none focus:border-accent mb-2"
              />
            )}
            <div className="flex gap-2">
              {!rejecting ? (
                <>
                  <button disabled={isLoading} onClick={() => handleQc('approved')} className="rounded-lg bg-good text-white px-3 py-1.5 text-[12px] font-medium cursor-pointer active:scale-95">Approve photos</button>
                  <button onClick={() => setRejecting(true)} className="rounded-lg border border-critical/40 text-critical px-3 py-1.5 text-[12px] cursor-pointer active:scale-95">Reject</button>
                </>
              ) : (
                <>
                  <button disabled={isLoading} onClick={() => handleQc('rejected')} className="rounded-lg bg-critical text-white px-3 py-1.5 text-[12px] font-medium cursor-pointer active:scale-95">Reject with reason</button>
                  <button onClick={() => setRejecting(false)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] cursor-pointer">Cancel</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-muted">Waiting for a senior to review the photos.</p>
        )
      )}
    </Panel>
  )
}

export default Turnovers
