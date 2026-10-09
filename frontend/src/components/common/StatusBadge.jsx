import React from 'react'
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiClock, FiInfo, FiMinusCircle } from 'react-icons/fi'

// Status colors always come with an icon + label, never color alone
const LEVELS = {
  good: { icon: FiCheckCircle, cls: 'bg-good/10 text-good-text ring-good/30' },
  warning: { icon: FiAlertTriangle, cls: 'bg-warning/15 text-[#7a5200] ring-warning/40' },
  serious: { icon: FiAlertTriangle, cls: 'bg-serious/15 text-[#8a3a17] ring-serious/40' },
  critical: { icon: FiAlertOctagon, cls: 'bg-critical/10 text-critical ring-critical/30' },
  pending: { icon: FiClock, cls: 'bg-slate-100 text-ink-2 ring-slate-300' },
  info: { icon: FiInfo, cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  neutral: { icon: FiMinusCircle, cls: 'bg-slate-100 text-ink-2 ring-slate-200' },
}

const StatusBadge = ({ level = 'neutral', children }) => {
  const { icon: Icon, cls } = LEVELS[level] || LEVELS.neutral
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 whitespace-nowrap ${cls}`}>
      <Icon className="shrink-0" size={12} />
      {children}
    </span>
  )
}

export default StatusBadge
