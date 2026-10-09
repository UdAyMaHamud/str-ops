import React from 'react'

const PageHeader = ({ title, subtitle, children }) => {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-[19px] font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-2 max-w-3xl">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 no-print">{children}</div>}
    </div>
  )
}

export default PageHeader
