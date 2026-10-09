import React, { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { FiChevronDown } from 'react-icons/fi'
import Panel from '../common/Panel'
import { baseOptions, BAR_SOFT, BAR_STRONG } from '../common/chartSetup'
import { money, pct, fmtShortDate } from '../common/format'

const PERIODS = [7, 30, 60]

// Diagonal-stripe fill for the best night, like the design's highlighted bar
const makeHatch = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 8
  canvas.height = 8
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = BAR_STRONG
  ctx.fillRect(0, 0, 8, 8)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-2, 10)
  ctx.lineTo(10, -2)
  ctx.stroke()
  return ctx.createPattern(canvas, 'repeat')
}

// ====== Room revenue per night, best night highlighted
const RevenueReport = ({ trend, days, onDaysChange, title = 'Revenue report', className = '' }) => {
  const hatch = useMemo(() => makeHatch(), [])
  const bestIndex = trend.reduce((best, t, i, arr) => (t.revenue > arr[best].revenue ? i : best), 0)
  const isEmpty = trend.every((t) => t.revenue === 0)

  return (
    <Panel
      title={title}
      source="Room revenue per night · PMS reservations"
      rule="Worried if several nights in a row drop to $0 while the calendar shows bookings."
      className={className}
      action={
        onDaysChange && (
          <div className="relative">
            <select
              value={days}
              onChange={(e) => onDaysChange(Number(e.target.value))}
              className="appearance-none h-9 rounded-full border border-line bg-white pl-3.5 pr-8 text-[12px] font-medium cursor-pointer outline-none"
              aria-label="Period"
            >
              {PERIODS.map((p) => <option key={p} value={p}>Last {p} days</option>)}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={13} />
          </div>
        )
      }
    >
      {isEmpty ? (
        <div className="h-64 flex items-center justify-center rounded-2xl border border-dashed border-line text-[13px] text-muted">No booked nights in this period yet</div>
      ) : (
        <div className="h-64">
          <Bar
            data={{
              labels: trend.map((t) => fmtShortDate(t.date)),
              datasets: [{
                label: 'Room revenue',
                data: trend.map((t) => t.revenue),
                backgroundColor: trend.map((_, i) => (i === bestIndex ? hatch : BAR_SOFT)),
                hoverBackgroundColor: trend.map((_, i) => (i === bestIndex ? hatch : '#8fbf9d')),
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: days <= 7 ? 48 : 22,
              }],
            }}
            options={{
              ...baseOptions,
              plugins: {
                ...baseOptions.plugins,
                tooltip: {
                  ...baseOptions.plugins.tooltip,
                  displayColors: false,
                  callbacks: {
                    title: (items) => `${items[0].label}${items[0].dataIndex === bestIndex ? ' · best night' : ''}`,
                    label: (ctx) => `${money(ctx.raw)} · ${pct(trend[ctx.dataIndex].occupancy)} occupied`,
                  },
                },
              },
              scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, ticks: { callback: (v) => money(v) } } },
            }}
          />
        </div>
      )}
    </Panel>
  )
}

export default RevenueReport
