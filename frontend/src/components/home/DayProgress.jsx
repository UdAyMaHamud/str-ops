import React from 'react'

// 24 segments: done, today, upcoming; checkpoints are marked (Days 6, 12, 18, 22-24)
const CHECKPOINTS = [6, 12, 18, 22, 23, 24]

const DayProgress = ({ day, total = 24, dark = false }) => {
  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`Day ${day} of ${total}`}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1
          const state = n < day ? 'done' : n === day ? 'today' : 'next'
          const color = dark
            ? state === 'done' ? 'bg-[#9cd3ad]' : state === 'today' ? 'bg-white' : 'bg-white/15'
            : state === 'done' ? 'bg-accent' : state === 'today' ? 'bg-primary' : 'bg-mint'
          return (
            <span key={n} title={`Day ${n}${CHECKPOINTS.includes(n) ? ' · checkpoint' : ''}`} className={`relative h-2.5 flex-1 rounded-full ${color}`}>
              {CHECKPOINTS.includes(n) && <span className={`absolute -top-2 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${dark ? 'bg-warning' : 'bg-serious'}`} />}
            </span>
          )
        })}
      </div>
      <div className={`mt-1.5 flex justify-between text-[10px] ${dark ? 'text-white/50' : 'text-muted'}`}>
        <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
      </div>
    </div>
  )
}

export default DayProgress
