import React from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { useGetTicketsQuery, useUpdateTicketMutation } from '../store/api/opsApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { money, timeAgo, label } from '../components/common/format'

const URGENCY_LEVEL = { urgent: 'critical', high: 'serious', medium: 'warning', low: 'neutral' }
const STATUS_LEVEL = { open: 'pending', assigned: 'info', in_progress: 'info', closed: 'good' }

const Maintenance = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetTicketsQuery(property)
  const [updateTicket] = useUpdateTicketMutation()
  const tickets = data?.data || []

  const handleStatus = async (id, status) => {
    try {
      const res = await updateTicket({ id, status }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Guest problems turned into tickets: property, issue, urgency, vendor and access info (never the code itself)." />
      <StateBlock isLoading={isLoading} error={error} isEmpty={!tickets.length} emptyText="No tickets">
        <Panel title={`Tickets (${tickets.filter((t) => t.status !== 'closed').length} open)`} source="PMS tasks · webhook" rule="Worried if an urgent ticket has no vendor update for 2 hours, or a guest has no update within the promised time frame.">
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t._id} className="py-3.5 grid md:grid-cols-[1fr_220px] gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge level={URGENCY_LEVEL[t.urgency]}>{label(t.urgency)}</StatusBadge>
                    <p className="text-[14px] font-semibold">{t.issue}</p>
                  </div>
                  <p className="text-[12px] text-ink-2 mt-1">
                    {t.property?.code} · {t.property?.name} · {t.category}
                    {t.reservationCode && <> · <span className="font-mono">{t.reservationCode}</span></>}
                  </p>
                  <p className="text-[12px] mt-1">
                    <span className="text-muted">Vendor:</span> {t.vendor || '–'} · <span className="text-muted">Access:</span> {t.accessInfo || '–'} · <span className="text-muted">Photos:</span> {t.photos}
                    {t.cost > 0 && <> · <span className="text-muted">Cost:</span> {money(t.cost)}</>}
                  </p>
                  <ol className="mt-2 border-l-2 border-line pl-3 space-y-1">
                    {t.updates.map((u, i) => (
                      <li key={i} className="text-[12px]"><span className="text-muted">{timeAgo(u.at)}:</span> {u.note}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex md:flex-col md:items-end gap-2">
                  <StatusBadge level={STATUS_LEVEL[t.status]}>{label(t.status)}</StatusBadge>
                  {isSenior && (
                    <select
                      value={t.status}
                      onChange={(e) => handleStatus(t._id, e.target.value)}
                      className="h-8 rounded-lg border border-line px-2 text-[12px] cursor-pointer"
                      aria-label="Change status"
                    >
                      {['open', 'assigned', 'in_progress', 'closed'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </StateBlock>
    </>
  )
}

export default Maintenance
