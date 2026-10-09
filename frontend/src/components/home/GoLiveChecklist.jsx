import React from 'react'
import toast from 'react-hot-toast'
import { FiCheckCircle, FiCircle, FiRefreshCw } from 'react-icons/fi'
import { useGetSetupStatusQuery, useSyncHostawayMutation } from '../../store/api/authApi'
import Panel from '../common/Panel'

// ====== Admin: what is still needed before the platform runs on real data
const GoLiveChecklist = () => {
  const { data } = useGetSetupStatusQuery()
  const [syncHostaway, { isLoading: syncing }] = useSyncHostawayMutation()
  const setup = data?.data
  if (!setup) return null

  // The frontend half of Google sign-in lives in the frontend .env
  const googleFrontend = !!import.meta.env.VITE_GOOGLE_CLIENT_ID
  const steps = setup.steps.map((s) =>
    s.key === 'google' ? { ...s, done: s.done && googleFrontend, detail: s.done && !googleFrontend ? 'Backend is set. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.' : s.detail } : s
  )
  const done = steps.filter((s) => s.done).length
  const hostawayReady = !steps.find((s) => s.key === 'hostaway')?.detail.startsWith('Set HOSTAWAY')

  const handleSync = async () => {
    try {
      const res = await syncHostaway().unwrap()
      toast.success(res.message, { duration: 4000, position: 'top-center' })
    } catch (err) {
      toast.error(err?.data?.message || 'Sync failed', { position: 'top-center' })
    }
  }

  return (
    <Panel
      title={`Go-live checklist · ${done}/${steps.length}`}
      source="Read from the server .env (values are never shown)"
      rule="Credentials go in the .env files only. Never paste them into chat, tickets or prompts."
    >
      <div className="h-2 rounded-full bg-mint mb-4">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((s) => (
          <li key={s.key} className={`rounded-2xl border p-3 ${s.done ? 'border-good/30 bg-good/5' : 'border-line/70'}`}>
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              {s.done ? <FiCheckCircle className="text-good-text shrink-0" /> : <FiCircle className="text-muted shrink-0" />}
              {s.title}
            </p>
            <p className="mt-1 text-[12px] text-ink-2">{s.detail}</p>
            {s.key === 'hostaway' && hostawayReady && (
              <button onClick={handleSync} disabled={syncing} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-white px-3 py-1.5 text-[12px] font-semibold cursor-pointer active:scale-95 disabled:opacity-60">
                <FiRefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync now'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export default GoLiveChecklist
