import React from 'react'

// ====== Loading / error / empty, same visual language everywhere
const StateBlock = ({ isLoading, error, isEmpty, emptyText = 'Nothing here yet', children }) => {
  if (isLoading) return <p className="text-center py-16 text-[12px] font-semibold uppercase tracking-wider text-muted">Loading…</p>
  if (error)
    return (
      <p className="text-center py-16 text-[12px] font-semibold uppercase tracking-wider text-critical">
        {error?.data?.message || error?.error || 'Failed to load'}
      </p>
    )
  if (isEmpty) return <div className="border border-dashed border-line rounded-2xl py-12 text-center text-[13px] text-muted">{emptyText}</div>
  return children
}

export default StateBlock
