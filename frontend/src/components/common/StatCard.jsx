import React from 'react'
import { FiInfo } from 'react-icons/fi'

// KPI tile: icon + title, hero number, delta pill and a reference line
const StatCard = ({ title, value, delta, deltaGood = true, sub, hint, icon: Icon }) => {
  const hasDelta = delta !== null && delta !== undefined && delta !== '–'
  const isUp = hasDelta && !String(delta).startsWith('-')
  const good = isUp === deltaGood

  return (
    <div className="bg-white rounded-3xl border border-line/70 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="h-9 w-9 shrink-0 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
              <Icon size={16} />
            </span>
          )}
          <p className="text-[13px] font-semibold text-ink truncate">{title}</p>
        </div>
        {hint && (
          <span title={hint} className="h-7 w-7 shrink-0 rounded-full border border-line text-muted flex items-center justify-center cursor-help">
            <FiInfo size={13} />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <p className="text-[28px] leading-none font-bold text-ink tabular">{value}</p>
        {hasDelta && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${good ? 'bg-primary-soft text-good-text' : 'bg-critical/10 text-critical'}`}>
            {isUp ? '+' : '−'}{String(delta).replace(/^[-+]/, '')}
          </span>
        )}
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
      </div>
    </div>
  )
}

export default StatCard
