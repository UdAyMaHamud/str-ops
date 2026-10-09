import React from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { FiVolume2, FiWifi, FiLock } from 'react-icons/fi'
import { useGetAlertsQuery, useUpdateAlertMutation } from '../store/api/opsApi'
import { selectProperty } from '../store/slices/filterSlice'
import { selectIsSenior } from '../store/slices/authSlice'
import PageHeader from '../components/common/PageHeader'
import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import StateBlock from '../components/common/StateBlock'
import { timeAgo, fmtDateTime, label } from '../components/common/format'

const SOURCE_ICON = { Minut: FiVolume2, Domotz: FiWifi, 'Smart lock': FiLock }
const SEVERITY_LEVEL = { critical: 'critical', warning: 'warning', info: 'info' }

// What each alert means and the first response (workbook Day 5)
const ALERT_GUIDE = [
  { source: 'Minut', means: 'Noise, temperature or crowd above the set threshold.', first: 'Friendly reminder within 10 min. Still loud after 20 min: call guest, escalate to senior.' },
  { source: 'Domotz', means: 'Router or network device is offline or unstable.', first: 'Remote power-cycle. Still down after 10 min: call ISP, give guest a hotspot plan.' },
  { source: 'Smart lock', means: 'Low battery, failed codes or lock offline.', first: 'Check the code in the PMS, confirm with guest. Lockout: follow the Guest Lockout SOP.' },
]

const SmartHome = () => {
  const property = useSelector(selectProperty)
  const isSenior = useSelector(selectIsSenior)
  const { data, isLoading, error } = useGetAlertsQuery(property, { pollingInterval: 60000 })
  const [updateAlert] = useUpdateAlertMutation()
  const alerts = data?.data || []
  const open = alerts.filter((a) => a.status !== 'resolved')
  const closed = alerts.filter((a) => a.status === 'resolved')

  const handleStatus = async (id, status) => {
    try {
      const res = await updateAlert({ id, status }).unwrap()
      toast.success(res.message, { duration: 2500, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Something went wrong', { position: 'top-center' })
    }
  }

  const renderAlert = (a) => {
    const Icon = SOURCE_ICON[a.source] || FiWifi
    return (
      <li key={a._id} className="py-3 flex gap-3">
        <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-page flex items-center justify-center text-primary">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold">{a.property?.code} · {a.type}</p>
            <StatusBadge level={SEVERITY_LEVEL[a.severity]}>{label(a.severity)}</StatusBadge>
            <StatusBadge level={a.status === 'open' ? 'serious' : a.status === 'acknowledged' ? 'info' : 'good'}>{label(a.status)}</StatusBadge>
            <span className="text-[11px] text-muted">{a.source} · {timeAgo(a.raisedAt)} · {fmtDateTime(a.raisedAt, a.property?.timezone)} local</span>
          </div>
          <p className="text-[13px] mt-1">{a.message}</p>
          <p className="text-[12px] text-ink-2 mt-1"><span className="font-semibold">First response:</span> {a.firstResponse}</p>
          {a.reservationCode && <p className="text-[11px] text-muted mt-1 font-mono">{a.reservationCode}</p>}
          {isSenior && a.status !== 'resolved' && (
            <div className="flex gap-2 mt-2">
              {a.status === 'open' && (
                <button onClick={() => handleStatus(a._id, 'acknowledged')} className="rounded-lg border border-line px-3 py-1 text-[12px] cursor-pointer active:scale-95">Acknowledge</button>
              )}
              <button onClick={() => handleStatus(a._id, 'resolved')} className="rounded-lg bg-good text-white px-3 py-1 text-[12px] cursor-pointer active:scale-95">Resolve</button>
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <>
      <PageHeader title="Smart Home" subtitle="Noise (Minut), wifi (Domotz) and smart lock alerts from the last 7 days." />
      <StateBlock isLoading={isLoading} error={error}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
          <div className="space-y-5">
            <Panel title={`Open alerts (${open.length})`} source="Minut + Smart lock webhooks · Domotz polling every 10 min" rule="Worried if a critical alert stays open over 15 minutes. Stop and escalate.">
              {open.length ? <ul className="divide-y divide-line">{open.map(renderAlert)}</ul> : <div className="py-6 text-center"><StatusBadge level="good">No open alerts</StatusBadge></div>}
            </Panel>
            <Panel title="Resolved" source="Last 7 days">
              {closed.length ? <ul className="divide-y divide-line opacity-80">{closed.map(renderAlert)}</ul> : <p className="text-[12px] text-muted">None</p>}
            </Panel>
          </div>
          <Panel title="What each alert means" source="Workbook Day 5 alert table">
            <ul className="space-y-3">
              {ALERT_GUIDE.map((g) => (
                <li key={g.source}>
                  <p className="text-[13px] font-semibold">{g.source}</p>
                  <p className="text-[12px] text-ink-2">{g.means}</p>
                  <p className="text-[12px] mt-0.5"><span className="font-semibold">First:</span> {g.first}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </StateBlock>
    </>
  )
}

export default SmartHome
