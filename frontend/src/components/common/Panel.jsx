import React from 'react'
import { FiDatabase, FiActivity } from 'react-icons/fi'

// Every panel says where its data comes from and what "worried" looks like (Day 15)
const Panel = ({ title, source, rule, action, children, className = '' }) => {
  return (
    <section className={`min-w-0 bg-white rounded-3xl border border-line/70 shadow-[0_1px_2px_rgba(20,28,23,0.03)] flex flex-col ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {source && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                <FiDatabase size={11} /> {source}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 no-print">{action}</div>}
        </header>
      )}
      <div className="px-5 pb-5 flex-1">{children}</div>
      {rule && (
        <footer className="no-print flex items-start gap-1.5 border-t border-line/70 px-5 py-3 text-[11px] text-ink-2">
          <FiActivity size={12} className="mt-0.5 shrink-0 text-accent" />
          <span>{rule}</span>
        </footer>
      )}
    </section>
  )
}

export default Panel
